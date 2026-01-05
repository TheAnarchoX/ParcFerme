# Security Policy

## Supported Versions

Parc Fermé is currently in active development (pre-v1.0). Security updates will be applied to the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :white_check_mark: (development) |

Once v1.0 is released, we will maintain security updates for:
- Current major version (e.g., 1.x)
- Previous major version for 6 months after a new major release

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

### Preferred Method: GitHub Security Advisories
1. Go to the [Security Advisories](https://github.com/TheAnarchoX/ParcFerme/security/advisories) page
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

### Alternative: Email
If you prefer, you can email security concerns to the maintainers. You can find contact information in the repository.

### What to Include
Please include as much of the following information as possible:
- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Affected component(s) (API, web frontend, Python ingestion, etc.)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if available)
- Impact assessment (what an attacker could achieve)
- Suggested fix (if you have one)

## Response Timeline
- **Initial Response**: Within 48 hours of report submission
- **Status Update**: Every 7 days until resolution
- **Fix Timeline**: 
  - Critical vulnerabilities: 7 days
  - High severity: 30 days
  - Medium/Low severity: 90 days

## Disclosure Policy
We follow responsible disclosure practices:
1. We will confirm receipt of your report within 48 hours
2. We will provide regular updates on our progress
3. We will credit you in the security advisory (unless you prefer to remain anonymous)
4. We will coordinate the public disclosure date with you
5. We typically aim to publicly disclose vulnerabilities within 90 days of the initial report, once a fix is available

## Security Best Practices for Contributors

If you're contributing to Parc Fermé, please keep these security practices in mind:

### Authentication & Authorization
- Never commit API keys, tokens, or credentials
- Use environment variables for sensitive configuration
- Implement proper JWT validation and refresh token rotation
- Respect the "Paddock Pass" (Pro tier) authorization system

### Spoiler Protection
- **Critical**: Never leak race results to users who haven't logged the event
- Ensure spoiler checks are enforced server-side, not just in the UI
- Test spoiler protection for edge cases (timezones, partial logs, etc.)

### Data Validation
- Validate all user inputs server-side
- Use parameterized queries to prevent SQL injection
- Sanitize data before rendering in the UI to prevent XSS
- Implement rate limiting on all public endpoints

### Dependencies
- Keep dependencies up to date (Dependabot is enabled)
- Review security advisories for critical dependencies
- Don't introduce dependencies with known vulnerabilities

### API Security
- All production APIs must use HTTPS
- Implement proper CORS policies
- Use security headers (CSP, X-Frame-Options, etc.)
- Never expose internal error details in production

## Security Features

Parc Fermé implements several security measures:

- **JWT-based authentication** with refresh tokens
- **OAuth2 integration** (Google, Discord) for secure third-party login
- **Redis-based session management** with automatic expiration
- **PostgreSQL with parameterized queries** to prevent SQL injection
- **Rate limiting** on API endpoints
- **HTTPS-only** in production
- **Security headers** via ASP.NET Core middleware
- **Automated dependency scanning** via CodeQL and Dependabot
- **Secret scanning** to prevent credential leaks

## Hall of Fame

We appreciate security researchers who help keep Parc Fermé safe. Contributors who report valid security issues will be listed here (with permission):

*No reports yet - be the first! 🏁*

---

Thank you for helping keep Parc Fermé and its users safe! 🏎️
