using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using SalahTimingsApp.Models;
using SalahTimingsApp.Services;

using System.Text.Json; // For JsonSerializer options

namespace SalahTimingsApp.Controllers
{
    [ApiController] // Indicates that the controller responds to web API requests
    [Route("api/[controller]")] // Sets the base route for this controller (e.g., /api/Data)
    public class DataController : ControllerBase
    {
        private readonly FileManager _fileManager;
        private readonly ILogger<DataController> _logger;

        public DataController(FileManager fileManager, ILogger<DataController> logger)
        {
            _fileManager = fileManager;
            _logger = logger;
        }

        // GET: api/Data/GetTimings?tabName=fajr.csv
        [HttpGet("GetTimings")]
        public async Task<IActionResult> GetTimings(string tabName)
        {
            if (string.IsNullOrEmpty(tabName))
            {
                return BadRequest("Tab name is required.");
            }

            // Basic validation to prevent path traversal (e.g., "..\..\users.txt")
            // Ensure only allowed CSV files are accessed
            var allowedFiles = new List<string> {
                "fajr.csv", "dhuhr.csv", "jumah.csv", "asr.csv", "maghrib.csv", "isha.csv"
            };

            if (!allowedFiles.Contains(tabName.ToLower()))
            {
                _logger.LogWarning($"Attempted to access unauthorized file: {tabName}");
                return Forbid("Access to this file is not allowed.");
            }

            try
            {
                var timings = await _fileManager.ReadSalahTimingsAsync(tabName);
                return Ok(timings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting timings for {tabName}");
                return StatusCode(500, "Internal server error while retrieving data.");
            }
        }

        // POST: api/Data/SaveTimings
        // Requires authentication to save data
        [Authorize] // Only authenticated users can access this endpoint
        [HttpPost("SaveTimings")]
        public async Task<IActionResult> SaveTimings([FromBody] SaveTimingsRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.TabName) || request.Timings == null)
            {
                return BadRequest("Invalid request data.");
            }

            // Basic validation for tabName (same as GetTimings)
            var allowedFiles = new List<string> {
                "fajr.csv", "dhuhr.csv", "jumah.csv", "asr.csv", "maghrib.csv", "isha.csv"
            };

            if (!allowedFiles.Contains(request.TabName.ToLower()))
            {
                _logger.LogWarning($"Attempted to save to unauthorized file: {request.TabName} by user {User.Identity.Name}");
                return Forbid("Saving to this file is not allowed.");
            }

            try
            {
                await _fileManager.WriteSalahTimingsAsync(request.TabName, request.Timings);
                return Ok(new { message = "Timings saved successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error saving timings for {request.TabName} by user {User.Identity.Name}");
                return StatusCode(500, "Internal server error while saving data.");
            }
        }
    }

    // DTO for SaveTimings POST request
    public class SaveTimingsRequest
    {
        public string TabName { get; set; } = string.Empty;
        public List<SalahTiming> Timings { get; set; } = new List<SalahTiming>();
    }
}