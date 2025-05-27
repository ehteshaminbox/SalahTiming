namespace STiming.Models
{
    public class UserActivity
    {
        public DateTime Timestamp { get; set; }
        public string UserId { get; set; } // Or Username/Email
        public string ActivityType { get; set; } // e.g., "Login", "View Tab", "Edit Timing"
        public string Details { get; set; } // e.g., "Fajr tab viewed", "Timing for Masjid X updated"
    }
}
