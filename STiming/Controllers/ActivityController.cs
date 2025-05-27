using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using STiming.Models;
using STiming.Services;

namespace STiming.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActivityController : ControllerBase
    {
        private readonly ActivityLogger _activityLogger;

        public ActivityController(ActivityLogger activityLogger)
        {
            _activityLogger = activityLogger;
        }

        [HttpPost("Log")]
        // [Authorize] // Uncomment this if you want only authenticated users to log activities
        public IActionResult Log([FromBody] UserActivity activity)
        {
            // You might want to get UserId from HttpContext.User.Identity.Name or HttpContext.User.FindFirst(ClaimTypes.NameIdentifier).Value
            // For now, assume it's passed from frontend or set a default
            activity.Timestamp = DateTime.UtcNow;
            _activityLogger.LogActivity(activity);
            return Ok();
        }

        [HttpGet("GetLog")]
        [Authorize] // Ensure only logged-in users can view the log
        public ActionResult<List<UserActivity>> GetLog()
        {
            // Optional: Filter activities by user role if only admins should see all,
            // or by current user if they should only see their own activities.
            return _activityLogger.GetActivities();
        }
    }
}
