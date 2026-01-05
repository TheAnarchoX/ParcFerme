using Microsoft.AspNetCore.Mvc;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Health check and status endpoint.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class StatusController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new StatusResponse(
            Service: "Parc Fermé API",
            Version: "1.0.0",
            Status: "healthy",
            Timestamp: DateTime.UtcNow
        ));
    }
}

public record StatusResponse(
    string Service,
    string Version,
    string Status,
    DateTime Timestamp
);
