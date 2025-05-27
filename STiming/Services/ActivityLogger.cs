using STiming.Models;
using System.Text.Json;

namespace STiming.Services
{
    // Example (simplified) of an activity logging service
    public class ActivityLogger
    {
        private readonly string _logFilePath;
        private static readonly object _lock = new object(); // For thread-safe file access

        public ActivityLogger(IWebHostEnvironment env)
        {
            _logFilePath = Path.Combine(env.ContentRootPath, "App_Data", "activity_log.json");
            // Ensure the directory exists
            Directory.CreateDirectory(Path.GetDirectoryName(_logFilePath));
        }

        public void LogActivity(UserActivity activity)
        {
            var jsonString = JsonSerializer.Serialize(activity);
            lock (_lock)
            {
                File.AppendAllText(_logFilePath, jsonString + Environment.NewLine);
            }
        }

        public List<UserActivity> GetActivities()
        {
            var activities = new List<UserActivity>();
            lock (_lock)
            {
                if (File.Exists(_logFilePath))
                {
                    foreach (var line in File.ReadLines(_logFilePath))
                    {
                        try
                        {
                            var activity = JsonSerializer.Deserialize<UserActivity>(line);
                            activities.Add(activity);
                        }
                        catch (JsonException)
                        {
                            // Handle malformed lines if necessary
                        }
                    }
                }
            }
            return activities.OrderByDescending(a => a.Timestamp).ToList(); // Sort by newest first
        }
    }
}
