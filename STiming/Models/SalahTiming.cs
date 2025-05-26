namespace SalahTimingsApp.Models
{
    public class SalahTiming
    {
        public int SrNo { get; set; } // Seniority Number
        public string Title { get; set; } = string.Empty; // Masjid Name
        public string Time { get; set; } = string.Empty; // Salah Time (e.g., "05:30 AM")
        public string Location { get; set; } = string.Empty; // Location Name
        public string MapUrl { get; set; } = string.Empty; // Google Maps URL
    }
}