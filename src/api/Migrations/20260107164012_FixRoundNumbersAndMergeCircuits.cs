using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixRoundNumbersAndMergeCircuits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =========================
            // Part 1: Fix RoundNumbers
            // =========================
            // Recalculate RoundNumbers to be sequential per season (1-indexed for races, 0 for pre-season testing)
            // Uses a CTE to assign row numbers based on date ordering within each season
            
            migrationBuilder.Sql(@"
                -- First, identify pre-season testing rounds and set them to 0
                UPDATE ""Rounds""
                SET ""RoundNumber"" = 0
                WHERE ""Name"" ILIKE '%pre-season%' OR ""Name"" ILIKE '%testing%';
                
                -- Then, recalculate round numbers for non-testing rounds based on date order
                WITH numbered_rounds AS (
                    SELECT 
                        r.""Id"",
                        r.""SeasonId"",
                        ROW_NUMBER() OVER (
                            PARTITION BY r.""SeasonId"" 
                            ORDER BY r.""DateStart"", r.""OpenF1MeetingKey"" NULLS LAST
                        ) as new_round_number
                    FROM ""Rounds"" r
                    WHERE r.""Name"" NOT ILIKE '%pre-season%' 
                      AND r.""Name"" NOT ILIKE '%testing%'
                )
                UPDATE ""Rounds"" r
                SET ""RoundNumber"" = nr.new_round_number
                FROM numbered_rounds nr
                WHERE r.""Id"" = nr.""Id"";
            ");

            // =========================
            // Part 2: Merge Duplicate Circuits
            // =========================
            // Canonical mappings: merge short/informal names into official/canonical names
            // We keep the more complete/official name and add aliases for the informal names
            
            var circuitMerges = new (string duplicateName, string canonicalName)[]
            {
                ("Austin", "Circuit of the Americas"),
                ("Baku", "Baku City Circuit"),
                ("Catalunya", "Circuit de Barcelona-Catalunya"),
                ("Interlagos", "Autódromo José Carlos Pace"),
                ("Jeddah", "Jeddah Corniche Circuit"),
                ("Las Vegas", "Las Vegas Strip Circuit"),
                ("Lusail", "Lusail International Circuit"),
                ("Melbourne", "Albert Park Circuit"),
                ("Mexico City", "Autódromo Hermanos Rodríguez"),
                ("Miami", "Miami International Autodrome"),
                ("Monte Carlo", "Circuit de Monaco"),
                ("Montreal", "Circuit Gilles Villeneuve"),
                ("Monza", "Autodromo Nazionale Monza"),
                ("Sakhir", "Bahrain International Circuit"),
                ("Shanghai", "Shanghai International Circuit"),
                ("Singapore", "Marina Bay Street Circuit"),
                ("Spa-Francorchamps", "Circuit de Spa-Francorchamps"),
                ("Spielberg", "Red Bull Ring"),
                ("Suzuka", "Suzuka International Racing Course"),
                ("Zandvoort", "Circuit Zandvoort"),
                ("Silverstone", "Silverstone Circuit"),
            };

            foreach (var (duplicateName, canonicalName) in circuitMerges)
            {
                migrationBuilder.Sql($@"
                    DO $$
                    DECLARE
                        v_canonical_id uuid;
                        v_duplicate_id uuid;
                    BEGIN
                        -- Get the canonical circuit ID
                        SELECT ""Id"" INTO v_canonical_id 
                        FROM ""Circuits"" 
                        WHERE ""Name"" = '{canonicalName.Replace("'", "''")}';
                        
                        -- Get the duplicate circuit ID
                        SELECT ""Id"" INTO v_duplicate_id 
                        FROM ""Circuits"" 
                        WHERE ""Name"" = '{duplicateName.Replace("'", "''")}';
                        
                        -- Only proceed if both exist and are different
                        IF v_canonical_id IS NOT NULL AND v_duplicate_id IS NOT NULL AND v_canonical_id != v_duplicate_id THEN
                            -- Update all Rounds to use the canonical circuit
                            UPDATE ""Rounds""
                            SET ""CircuitId"" = v_canonical_id
                            WHERE ""CircuitId"" = v_duplicate_id;
                            
                            -- Add alias for the duplicate name (if not already exists)
                            INSERT INTO ""CircuitAliases"" (""Id"", ""CircuitId"", ""AliasName"", ""AliasSlug"", ""Source"")
                            SELECT 
                                gen_random_uuid(), 
                                v_canonical_id, 
                                '{duplicateName.Replace("'", "''")}', 
                                LOWER(REGEXP_REPLACE('{duplicateName.Replace("'", "''")}', '[^a-zA-Z0-9]+', '-', 'g')),
                                'migration-merge'
                            WHERE NOT EXISTS (
                                SELECT 1 FROM ""CircuitAliases"" 
                                WHERE ""CircuitId"" = v_canonical_id 
                                AND ""AliasName"" = '{duplicateName.Replace("'", "''")}'
                            );
                            
                            -- Delete any aliases pointing to the duplicate
                            DELETE FROM ""CircuitAliases"" WHERE ""CircuitId"" = v_duplicate_id;
                            
                            -- Delete the duplicate circuit
                            DELETE FROM ""Circuits"" WHERE ""Id"" = v_duplicate_id;
                            
                            RAISE NOTICE 'Merged circuit ""{duplicateName}"" into ""{canonicalName}""';
                        END IF;
                    END $$;
                ");
            }
            
            // Handle Imola specially - keep "Imola" as the commonly used name
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    v_imola_id uuid;
                BEGIN
                    SELECT ""Id"" INTO v_imola_id FROM ""Circuits"" WHERE ""Name"" = 'Imola';
                    
                    IF v_imola_id IS NOT NULL THEN
                        -- Add official name as alias
                        INSERT INTO ""CircuitAliases"" (""Id"", ""CircuitId"", ""AliasName"", ""AliasSlug"", ""Source"")
                        SELECT gen_random_uuid(), v_imola_id, 'Autodromo Enzo e Dino Ferrari', 'autodromo-enzo-e-dino-ferrari', 'official-name'
                        WHERE NOT EXISTS (
                            SELECT 1 FROM ""CircuitAliases"" 
                            WHERE ""CircuitId"" = v_imola_id AND ""AliasName"" = 'Autodromo Enzo e Dino Ferrari'
                        );
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This migration is not easily reversible as it involves data merging
            // The original round numbers from OpenF1 meeting_key % 100 cannot be reliably restored
            // The merged circuits cannot be unmerged without the original data
            
            // We could attempt to restore round numbers from OpenF1MeetingKey if available
            migrationBuilder.Sql(@"
                -- Attempt to restore original round numbers from OpenF1MeetingKey (rough approximation)
                UPDATE ""Rounds""
                SET ""RoundNumber"" = ""OpenF1MeetingKey"" % 100
                WHERE ""OpenF1MeetingKey"" IS NOT NULL;
            ");
            
            // Note: Circuit merges cannot be automatically reversed
            // Manual intervention would be required to recreate the duplicate circuits
        }
    }
}
