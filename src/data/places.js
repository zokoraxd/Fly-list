import { PLACE_ALIASES } from './placeAliases.js';

/** Punctuation stripped before tokenising user text. */
const PUNCTUATION = /[.,/#!$%^&*;:{}=\-_`~()?"'،؛؟«»]/g;

/**
 * Comprehensive Local Database of World Places
 * Covers Countries, Capitals, Major Cities, and Major Provinces/States.
 * Used for instant, zero-latency, offline place detection.
 */

export const PLACES = [
  // --- COUNTRIES & REGIONS ---
  { name: "Afghanistan", country: "Afghanistan", countryCode: "AF", flag: "🇦🇫", lat: 33.9391, lon: 67.7100 },
  { name: "Albania", country: "Albania", countryCode: "AL", flag: "🇦🇱", lat: 41.1533, lon: 20.1683 },
  { name: "Algeria", country: "Algeria", countryCode: "DZ", flag: "🇩🇿", lat: 28.0339, lon: 1.6596 },
  { name: "Argentina", country: "Argentina", countryCode: "AR", flag: "🇦🇷", lat: -38.4161, lon: -63.6167 },
  { name: "Armenia", country: "Armenia", countryCode: "AM", flag: "🇦🇲", lat: 40.0691, lon: 45.0382 },
  { name: "Australia", country: "Australia", countryCode: "AU", flag: "🇦🇺", lat: -25.2744, lon: 133.7751 },
  { name: "Austria", country: "Austria", countryCode: "AT", flag: "🇦🇹", lat: 47.5162, lon: 14.5501 },
  { name: "Azerbaijan", country: "Azerbaijan", countryCode: "AZ", flag: "🇦🇿", lat: 40.1431, lon: 47.5769 },
  { name: "Bahrain", country: "Bahrain", countryCode: "BH", flag: "🇧🇭", lat: 26.0667, lon: 50.5577 },
  { name: "Bangladesh", country: "Bangladesh", countryCode: "BD", flag: "🇧🇩", lat: 23.6850, lon: 90.3563 },
  { name: "Belgium", country: "Belgium", countryCode: "BE", flag: "🇧🇪", lat: 50.5039, lon: 4.4699 },
  { name: "Brazil", country: "Brazil", countryCode: "BR", flag: "🇧🇷", lat: -14.2350, lon: -51.9253 },
  { name: "Bulgaria", country: "Bulgaria", countryCode: "BG", flag: "🇧🇬", lat: 42.7339, lon: 25.4858 },
  { name: "Canada", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 56.1304, lon: -106.3468 },
  { name: "Chile", country: "Chile", countryCode: "CL", flag: "🇨🇱", lat: -35.6751, lon: -71.5430 },
  { name: "China", country: "China", countryCode: "CN", flag: "🇨🇳", lat: 35.8617, lon: 104.1954 },
  { name: "Colombia", country: "Colombia", countryCode: "CO", flag: "🇨🇴", lat: 4.5709, lon: -74.2973 },
  { name: "Croatia", country: "Croatia", countryCode: "HR", flag: "🇭🇷", lat: 45.1000, lon: 15.2000 },
  { name: "Cyprus", country: "Cyprus", countryCode: "CY", flag: "🇨🇾", lat: 35.1264, lon: 33.4299 },
  { name: "Czechia", country: "Czechia", countryCode: "CZ", flag: "🇨🇿", lat: 49.8175, lon: 15.4730 },
  { name: "Denmark", country: "Denmark", countryCode: "DK", flag: "🇩🇰", lat: 56.2639, lon: 9.5018 },
  { name: "Egypt", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 26.8206, lon: 30.8025 },
  { name: "England", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", lat: 52.3555, lon: -1.1743 },
  { name: "Finland", country: "Finland", countryCode: "FI", flag: "🇫🇮", lat: 61.9241, lon: 25.7482 },
  { name: "France", country: "France", countryCode: "FR", flag: "🇫🇷", lat: 46.2276, lon: 2.2137 },
  { name: "Georgia", country: "Georgia", countryCode: "GE", flag: "🇬🇪", lat: 42.3154, lon: 43.3569, wiki: "Georgia (country)" },
  { name: "Germany", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 51.1657, lon: 10.4515 },
  { name: "Greece", country: "Greece", countryCode: "GR", flag: "🇬🇷", lat: 39.0742, lon: 21.8243 },
  { name: "Hungary", country: "Hungary", countryCode: "HU", flag: "🇭🇺", lat: 47.1625, lon: 19.5033 },
  { name: "Iceland", country: "Iceland", countryCode: "IS", flag: "🇮🇸", lat: 64.9631, lon: -19.0208 },
  { name: "India", country: "India", countryCode: "IN", flag: "🇮🇳", lat: 20.5937, lon: 78.9629 },
  { name: "Indonesia", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", lat: -0.7893, lon: 113.9213 },
  { name: "Iran", country: "Iran", countryCode: "IR", flag: "🇮🇷", lat: 32.4279, lon: 53.6880 },
  { name: "Iraq", country: "Iraq", countryCode: "IQ", flag: "🇮🇶", lat: 33.2232, lon: 43.6793 },
  { name: "Ireland", country: "Ireland", countryCode: "IE", flag: "🇮🇪", lat: 53.1424, lon: -7.6921 },
  { name: "Italy", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 41.8719, lon: 12.5674 },
  { name: "Japan", country: "Japan", countryCode: "JP", flag: "🇯🇵", lat: 36.2048, lon: 138.2529 },
  { name: "Jordan", country: "Jordan", countryCode: "JO", flag: "🇯🇴", lat: 30.5852, lon: 36.2384 },
  { name: "Kuwait", country: "Kuwait", countryCode: "KW", flag: "🇰🇼", lat: 29.3117, lon: 47.4818 },
  { name: "Lebanon", country: "Lebanon", countryCode: "LB", flag: "🇱🇧", lat: 33.8547, lon: 35.8623 },
  { name: "Libya", country: "Libya", countryCode: "LY", flag: "🇱🇾", lat: 26.3351, lon: 17.2283 },
  { name: "Malaysia", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", lat: 4.2105, lon: 101.9758 },
  { name: "Maldives", country: "Maldives", countryCode: "MV", flag: "🇲🇻", lat: 3.2028, lon: 73.2207 },
  { name: "Mexico", country: "Mexico", countryCode: "MX", flag: "🇲🇽", lat: 23.6345, lon: -102.5528 },
  { name: "Morocco", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 31.7917, lon: -7.0926 },
  { name: "Netherlands", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", lat: 52.1326, lon: 5.2913 },
  { name: "New Zealand", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", lat: -40.9006, lon: 174.8860 },
  { name: "Norway", country: "Norway", countryCode: "NO", flag: "🇳🇴", lat: 60.4720, lon: 8.4689 },
  { name: "Oman", country: "Oman", countryCode: "OM", flag: "🇴🇲", lat: 21.4735, lon: 55.9754 },
  { name: "Pakistan", country: "Pakistan", countryCode: "PK", flag: "🇵🇰", lat: 30.3753, lon: 69.3451 },
  { name: "Palestine", country: "Palestine", countryCode: "PS", flag: "🇵🇸", lat: 31.9522, lon: 35.2332, wiki: "State of Palestine" },
  { name: "Peru", country: "Peru", countryCode: "PE", flag: "🇵🇪", lat: -9.1900, lon: -75.0152 },
  { name: "Philippines", country: "Philippines", countryCode: "PH", flag: "🇵🇭", lat: 12.8797, lon: 121.7740 },
  { name: "Poland", country: "Poland", countryCode: "PL", flag: "🇵🇱", lat: 51.9194, lon: 19.1451 },
  { name: "Portugal", country: "Portugal", countryCode: "PT", flag: "🇵🇹", lat: 39.3999, lon: -8.2245 },
  { name: "Qatar", country: "Qatar", countryCode: "QA", flag: "🇶🇦", lat: 25.3548, lon: 51.1839 },
  { name: "Romania", country: "Romania", countryCode: "RO", flag: "🇷🇴", lat: 45.9432, lon: 24.9668 },
  { name: "Russia", country: "Russia", countryCode: "RU", flag: "🇷🇺", lat: 61.5240, lon: 105.3188 },
  { name: "Saudi Arabia", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 23.8859, lon: 45.0792 },
  { name: "Scotland", country: "United Kingdom", countryCode: "GB", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", lat: 56.4907, lon: -4.2026 },
  { name: "Singapore", country: "Singapore", countryCode: "SG", flag: "🇸🇬", lat: 1.3521, lon: 103.8198 },
  { name: "South Africa", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", lat: -30.5595, lon: 22.9375 },
  { name: "South Korea", country: "South Korea", countryCode: "KR", flag: "🇰🇷", lat: 35.9078, lon: 127.7669 },
  { name: "Spain", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 40.4637, lon: -3.7492 },
  { name: "Sweden", country: "Sweden", countryCode: "SE", flag: "🇸🇪", lat: 60.1282, lon: 18.6435 },
  { name: "Switzerland", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", lat: 46.8182, lon: 8.2275 },
  { name: "Syria", country: "Syria", countryCode: "SY", flag: "🇸🇾", lat: 34.8021, lon: 38.9968 },
  { name: "Thailand", country: "Thailand", countryCode: "TH", flag: "🇹🇭", lat: 15.8700, lon: 100.9925 },
  { name: "Tunisia", country: "Tunisia", countryCode: "TN", flag: "🇹🇳", lat: 33.8869, lon: 9.5375 },
  { name: "Turkey", country: "Turkey", countryCode: "TR", flag: "🇹🇷", lat: 38.9637, lon: 35.2433 },
  { name: "United Arab Emirates", country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪", lat: 23.4241, lon: 53.8478 },
  { name: "United Kingdom", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", lat: 55.3781, lon: -3.4360 },
  { name: "United States", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 37.0902, lon: -95.7129 },
  { name: "Vietnam", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", lat: 14.0583, lon: 108.2772 },
  { name: "Yemen", country: "Yemen", countryCode: "YE", flag: "🇾🇪", lat: 15.5527, lon: 48.5164 },

  // --- MAJOR CITIES & CAPITALS ---
  // Middle East & North Africa
  { name: "Cairo", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 30.0444, lon: 31.2357 },
  { name: "Alexandria", wiki: "Alexandria, Egypt", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 31.2001, lon: 29.9187 },
  { name: "Giza", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 30.0131, lon: 31.2089 },
  { name: "Luxor", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 25.6872, lon: 32.6396 },
  { name: "Aswan", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 24.0889, lon: 32.8998 },
  { name: "Sharm El Sheikh", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 27.9158, lon: 34.3299 },
  { name: "Hurghada", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 27.2579, lon: 33.8116 },
  { name: "Dahab", country: "Egypt", countryCode: "EG", flag: "🇪🇬", lat: 28.5097, lon: 34.5136 },
  { name: "Dubai", country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪", lat: 25.2048, lon: 55.2708 },
  { name: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪", lat: 24.4539, lon: 54.3773 },
  { name: "Sharjah", country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪", lat: 25.3463, lon: 55.4209 },
  { name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 24.7136, lon: 46.6753 },
  { name: "Jeddah", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 21.4858, lon: 39.1925 },
  { name: "Mecca", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 21.3891, lon: 39.8579 },
  { name: "Medina", wiki: "Medina", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 24.5247, lon: 39.5692 },
  { name: "Dammam", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 26.4207, lon: 50.0888 },
  { name: "AlUla", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", lat: 26.6167, lon: 37.9167 },
  { name: "Doha", country: "Qatar", countryCode: "QA", flag: "🇶🇦", lat: 25.2854, lon: 51.5310 },
  { name: "Kuwait City", country: "Kuwait", countryCode: "KW", flag: "🇰🇼", lat: 29.3759, lon: 47.9774 },
  { name: "Manama", country: "Bahrain", countryCode: "BH", flag: "🇧🇭", lat: 26.2285, lon: 50.5860 },
  { name: "Muscat", country: "Oman", countryCode: "OM", flag: "🇴🇲", lat: 23.5880, lon: 58.3829 },
  { name: "Salalah", country: "Oman", countryCode: "OM", flag: "🇴🇲", lat: 17.0151, lon: 54.0924 },
  { name: "Amman", country: "Jordan", countryCode: "JO", flag: "🇯🇴", lat: 31.9454, lon: 35.9284 },
  { name: "Petra", country: "Jordan", countryCode: "JO", flag: "🇯🇴", lat: 30.3285, lon: 35.4444 },
  { name: "Aqaba", country: "Jordan", countryCode: "JO", flag: "🇯🇴", lat: 29.5321, lon: 35.0063 },
  { name: "Beirut", country: "Lebanon", countryCode: "LB", flag: "🇱🇧", lat: 33.8938, lon: 35.5018 },
  { name: "Baghdad", country: "Iraq", countryCode: "IQ", flag: "🇮🇶", lat: 33.3152, lon: 44.3661 },
  { name: "Erbil", country: "Iraq", countryCode: "IQ", flag: "🇮🇶", lat: 36.1911, lon: 44.0092 },
  { name: "Damascus", country: "Syria", countryCode: "SY", flag: "🇸🇾", lat: 33.5138, lon: 36.2765 },
  { name: "Jerusalem", country: "Palestine", countryCode: "PS", flag: "🇵🇸", lat: 31.7683, lon: 35.2137 },
  { name: "Marrakech", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 31.6295, lon: -7.9811 },
  { name: "Casablanca", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 33.5731, lon: -7.5898 },
  { name: "Rabat", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 34.0209, lon: -6.8416 },
  { name: "Fes", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 34.0181, lon: -5.0078 },
  { name: "Tangier", country: "Morocco", countryCode: "MA", flag: "🇲🇦", lat: 35.7595, lon: -5.8340 },
  { name: "Tunis", country: "Tunisia", countryCode: "TN", flag: "🇹🇳", lat: 36.8065, lon: 10.1815 },
  { name: "Algiers", country: "Algeria", countryCode: "DZ", flag: "🇩🇿", lat: 36.7538, lon: 3.0588 },
  { name: "Tripoli", wiki: "Tripoli, Libya", country: "Libya", countryCode: "LY", flag: "🇱🇾", lat: 32.8872, lon: 13.1913 },

  // Europe
  { name: "Paris", country: "France", countryCode: "FR", flag: "🇫🇷", lat: 48.8566, lon: 2.3522 },
  { name: "Nice", country: "France", countryCode: "FR", flag: "🇫🇷", lat: 43.7102, lon: 7.2620 },
  { name: "Lyon", country: "France", countryCode: "FR", flag: "🇫🇷", lat: 45.7640, lon: 4.8357 },
  { name: "Marseille", country: "France", countryCode: "FR", flag: "🇫🇷", lat: 43.2965, lon: 5.3698 },
  { name: "London", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", lat: 51.5074, lon: -0.1278 },
  { name: "Manchester", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", lat: 53.4808, lon: -2.2426 },
  { name: "Edinburgh", country: "United Kingdom", countryCode: "GB", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", lat: 55.9533, lon: -3.1883 },
  { name: "Rome", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 41.9028, lon: 12.4964 },
  { name: "Milan", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 45.4642, lon: 9.1900 },
  { name: "Venice", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 45.4408, lon: 12.3155 },
  { name: "Florence", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 43.7696, lon: 11.2558 },
  { name: "Naples", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 40.8518, lon: 14.2681 },
  { name: "Madrid", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 40.4168, lon: -3.7038 },
  { name: "Barcelona", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 41.3879, lon: 2.1699 },
  { name: "Seville", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 37.3891, lon: -5.9845 },
  { name: "Valencia", wiki: "Valencia, Spain", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 39.4699, lon: -0.3763 },
  { name: "Berlin", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 52.5200, lon: 13.4050 },
  { name: "Munich", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 48.1351, lon: 11.5820 },
  { name: "Frankfurt", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 50.1109, lon: 8.6821 },
  { name: "Hamburg", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 53.5511, lon: 9.9937 },
  { name: "Amsterdam", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", lat: 52.3676, lon: 4.9041 },
  { name: "Rotterdam", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", lat: 51.9244, lon: 4.4777 },
  { name: "Brussels", country: "Belgium", countryCode: "BE", flag: "🇧🇪", lat: 50.8503, lon: 4.3517 },
  { name: "Vienna", country: "Austria", countryCode: "AT", flag: "🇦🇹", lat: 48.2082, lon: 16.3738 },
  { name: "Salzburg", country: "Austria", countryCode: "AT", flag: "🇦🇹", lat: 47.8095, lon: 13.0550 },
  { name: "Zurich", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", lat: 47.3769, lon: 8.5417 },
  { name: "Geneva", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", lat: 46.2044, lon: 6.1432 },
  { name: "Prague", country: "Czech Republic", countryCode: "CZ", flag: "🇨🇿", lat: 50.0755, lon: 14.4378 },
  { name: "Budapest", country: "Hungary", countryCode: "HU", flag: "🇭🇺", lat: 47.4979, lon: 19.0402 },
  { name: "Warsaw", country: "Poland", countryCode: "PL", flag: "🇵🇱", lat: 52.2297, lon: 21.0122 },
  { name: "Krakow", country: "Poland", countryCode: "PL", flag: "🇵🇱", lat: 50.0647, lon: 19.9450 },
  { name: "Lisbon", country: "Portugal", countryCode: "PT", flag: "🇵🇹", lat: 38.7223, lon: -9.1393 },
  { name: "Porto", country: "Portugal", countryCode: "PT", flag: "🇵🇹", lat: 41.1579, lon: -8.6291 },
  { name: "Athens", country: "Greece", countryCode: "GR", flag: "🇬🇷", lat: 37.9838, lon: 23.7275 },
  { name: "Santorini", country: "Greece", countryCode: "GR", flag: "🇬🇷", lat: 36.3932, lon: 25.4615 },
  { name: "Mykonos", country: "Greece", countryCode: "GR", flag: "🇬🇷", lat: 37.4467, lon: 25.3289 },
  { name: "Dublin", country: "Ireland", countryCode: "IE", flag: "🇮🇪", lat: 53.3498, lon: -6.2603 },
  { name: "Stockholm", country: "Sweden", countryCode: "SE", flag: "🇸🇪", lat: 59.3293, lon: 18.0686 },
  { name: "Oslo", country: "Norway", countryCode: "NO", flag: "🇳🇴", lat: 59.9139, lon: 10.7522 },
  { name: "Copenhagen", country: "Denmark", countryCode: "DK", flag: "🇩🇰", lat: 55.6761, lon: 12.5683 },
  { name: "Helsinki", country: "Finland", countryCode: "FI", flag: "🇫🇮", lat: 60.1699, lon: 24.9384 },
  { name: "Reykjavik", country: "Iceland", countryCode: "IS", flag: "🇮🇸", lat: 64.1466, lon: -21.9426 },
  { name: "Istanbul", country: "Turkey", countryCode: "TR", flag: "🇹🇷", lat: 41.0082, lon: 28.9784 },
  { name: "Antalya", country: "Turkey", countryCode: "TR", flag: "🇹🇷", lat: 36.8969, lon: 30.7133 },
  { name: "Ankara", country: "Turkey", countryCode: "TR", flag: "🇹🇷", lat: 39.9334, lon: 32.8597 },
  { name: "Moscow", country: "Russia", countryCode: "RU", flag: "🇷🇺", lat: 55.7558, lon: 37.6173 },
  { name: "Saint Petersburg", country: "Russia", countryCode: "RU", flag: "🇷🇺", lat: 59.9311, lon: 30.3609 },

  // Asia & Oceania
  { name: "Tokyo", country: "Japan", countryCode: "JP", flag: "🇯🇵", lat: 35.6762, lon: 139.6503 },
  { name: "Kyoto", country: "Japan", countryCode: "JP", flag: "🇯🇵", lat: 35.0116, lon: 135.7681 },
  { name: "Osaka", country: "Japan", countryCode: "JP", flag: "🇯🇵", lat: 34.6937, lon: 135.5023 },
  { name: "Seoul", country: "South Korea", countryCode: "KR", flag: "🇰🇷", lat: 37.5665, lon: 126.9780 },
  { name: "Busan", country: "South Korea", countryCode: "KR", flag: "🇰🇷", lat: 35.1796, lon: 129.0756 },
  { name: "Beijing", country: "China", countryCode: "CN", flag: "🇨🇳", lat: 39.9042, lon: 116.4074 },
  { name: "Shanghai", country: "China", countryCode: "CN", flag: "🇨🇳", lat: 31.2304, lon: 121.4737 },
  { name: "Hong Kong", country: "China", countryCode: "HK", flag: "🇭🇰", lat: 22.3193, lon: 114.1694 },
  { name: "Taipei", country: "Taiwan", countryCode: "TW", flag: "🇹🇼", lat: 25.0330, lon: 121.5654 },
  { name: "Bangkok", country: "Thailand", countryCode: "TH", flag: "🇹🇭", lat: 13.7563, lon: 100.5018 },
  { name: "Phuket", country: "Thailand", countryCode: "TH", flag: "🇹🇭", lat: 7.8804, lon: 98.3923 },
  { name: "Chiang Mai", country: "Thailand", countryCode: "TH", flag: "🇹🇭", lat: 18.7883, lon: 98.9853 },
  { name: "Bali", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", lat: -8.4095, lon: 115.1889 },
  { name: "Jakarta", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", lat: -6.2088, lon: 106.8456 },
  { name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", lat: 3.1390, lon: 101.6869 },
  { name: "Hanoi", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", lat: 21.0285, lon: 105.8542 },
  { name: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", lat: 10.8231, lon: 106.6297 },
  { name: "Manila", country: "Philippines", countryCode: "PH", flag: "🇵🇭", lat: 14.5995, lon: 120.9842 },
  { name: "New Delhi", country: "India", countryCode: "IN", flag: "🇮🇳", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", country: "India", countryCode: "IN", flag: "🇮🇳", lat: 19.0760, lon: 72.8777 },
  { name: "Sydney", country: "Australia", countryCode: "AU", flag: "🇦🇺", lat: -33.8688, lon: 151.2093 },
  { name: "Melbourne", country: "Australia", countryCode: "AU", flag: "🇦🇺", lat: -37.8136, lon: 144.9631 },
  { name: "Auckland", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", lat: -36.8485, lon: 174.7633 },

  // Americas
  { name: "New York", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 40.7128, lon: -74.0060 },
  { name: "Los Angeles", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 34.0522, lon: -118.2437 },
  { name: "Chicago", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 41.8781, lon: -87.6298 },
  { name: "Miami", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 25.7617, lon: -80.1918 },
  { name: "San Francisco", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 37.7749, lon: -122.4194 },
  { name: "Las Vegas", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 36.1699, lon: -115.1398 },
  { name: "Washington", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 38.9072, lon: -77.0369, wiki: "Washington, D.C." },
  { name: "Orlando", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 28.5383, lon: -81.3792 },
  { name: "Boston", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 42.3601, lon: -71.0589 },
  { name: "Seattle", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 47.6062, lon: -122.3321 },
  { name: "Toronto", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 43.6532, lon: -79.3832 },
  { name: "Vancouver", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 49.2827, lon: -123.1207 },
  { name: "Montreal", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 45.5017, lon: -73.5673 },
  { name: "Mexico City", country: "Mexico", countryCode: "MX", flag: "🇲🇽", lat: 19.4326, lon: -99.1332 },
  { name: "Cancun", country: "Mexico", countryCode: "MX", flag: "🇲🇽", lat: 21.1619, lon: -86.8515 },
  { name: "Buenos Aires", country: "Argentina", countryCode: "AR", flag: "🇦🇷", lat: -34.6037, lon: -58.3816 },
  { name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", flag: "🇧🇷", lat: -22.9068, lon: -43.1729 },
  { name: "Sao Paulo", country: "Brazil", countryCode: "BR", flag: "🇧🇷", lat: -23.5505, lon: -46.6333 },
  { name: "Santiago", wiki: "Santiago, Chile", country: "Chile", countryCode: "CL", flag: "🇨🇱", lat: -33.4489, lon: -70.6693 },
  { name: "Lima", country: "Peru", countryCode: "PE", flag: "🇵🇪", lat: -12.0464, lon: -77.0428 },
  { name: "Cusco", country: "Peru", countryCode: "PE", flag: "🇵🇪", lat: -13.5319, lon: -71.9675 },
  { name: "Bogota", country: "Colombia", countryCode: "CO", flag: "🇨🇴", lat: 4.7110, lon: -74.0721 },

  // --- MAJOR STATES / PROVINCES / GOVERNORATES ---
  { name: "California", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 36.7783, lon: -119.4179 },
  { name: "Florida", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 27.6648, lon: -81.5158 },
  { name: "Texas", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 31.9686, lon: -99.9018 },
  { name: "Hawaii", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 19.8968, lon: -155.5828 },
  { name: "Alaska", country: "United States", countryCode: "US", flag: "🇺🇸", lat: 64.2008, lon: -149.4937 },
  { name: "Ontario", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 51.2538, lon: -85.3232 },
  { name: "Quebec", country: "Canada", countryCode: "CA", flag: "🇨🇦", lat: 52.9399, lon: -73.5491 },
  { name: "Bavaria", country: "Germany", countryCode: "DE", flag: "🇩🇪", lat: 48.7904, lon: 11.4979 },
  { name: "Catalonia", country: "Spain", countryCode: "ES", flag: "🇪🇸", lat: 41.5912, lon: 1.5209 },
  { name: "Tuscany", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 43.7711, lon: 11.2486 },
  { name: "Sicily", country: "Italy", countryCode: "IT", flag: "🇮🇹", lat: 37.5999, lon: 14.0154 }
];


/**
 * Names that are also ordinary words or personal names. They only match when
 * the user capitalised them ("Flight to Nice") or put a travel cue in front
 * ("flight to nice"). "Have a nice flight" or "buy a turkey" will not match.
 */
export const AMBIGUOUS_NAMES = new Set([
  'nice', 'turkey', 'jordan', 'georgia', 'washington', 'china', 'chile', 'orlando',
  'petra', 'florence', 'sydney', 'alexandria', 'valencia', 'manila', 'medina', 'lima',
  'victoria', 'santiago', 'bath', 'reading', 'mobile', 'split', 'cork', 'phoenix',
]);

/**
 * Ambiguous names that are also common personal names. These need a cue word
 * before them or a travel keyword somewhere in the sentence, so "Call Jordan"
 * stays a plain task while "Jordan trip" and "Trip to Jordan" match.
 */
const PERSON_NAMES = new Set([
  'jordan', 'georgia', 'florence', 'sydney', 'alexandria', 'valencia', 'orlando',
  'petra', 'victoria', 'washington', 'medina', 'nice',
]);

/** Words that signal the sentence is about travelling at all. */
const TRAVEL_KEYWORDS = new Set([
  'flight', 'flights', 'fly', 'flying', 'trip', 'travel', 'traveling', 'travelling', 'visit',
  'visiting', 'tour', 'tourism', 'vacation', 'holiday', 'holidays', 'hotel', 'hostel', 'airbnb',
  'airport', 'ticket', 'tickets', 'book', 'booking', 'itinerary', 'destination', 'explore', 'weekend',
  'رحلة', 'رحله', 'سفر', 'سفرة', 'سفره', 'طيران', 'فندق', 'حجز', 'زيارة', 'زياره', 'تذكرة', 'تذاكر',
  'مطار', 'اجازة', 'إجازة', 'اجازه', 'سياحة', 'سياحه',
]);

/** Words that usually introduce a destination. */
const DESTINATION_CUES = new Set([
  'to', 'into', 'toward', 'towards', 'visit', 'visiting', 'explore', 'exploring',
  'tour', 'touring', 'see', 'reach', 'destination',
  'إلى', 'الى', 'نحو', 'زيارة', 'زياره', 'نزور', 'أزور', 'ازور',
]);

/** Words that introduce a location without implying destination vs. origin. */
const NEUTRAL_CUES = new Set(['in', 'at', 'around', 'near', 'via', 'في', 'فى', 'ب', 'بـ', 'عند', 'قرب']);

/** Words that introduce an origin — matches after them are deprioritised. */
const ORIGIN_CUES = new Set(['from', 'leaving', 'leave', 'depart', 'departing', 'من']);

const ARABIC_RANGE = /[؀-ۿ]/;
const TASHKEEL = /[ً-ْٰـ]/g;

/**
 * Normalise an Arabic or Latin token for dictionary lookup:
 * lower-case, strip diacritics/tatweel, unify alef/ya/ta-marbuta variants.
 *
 * @param {string} token
 * @returns {string}
 */
export function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(TASHKEEL, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

/**
 * Arabic clitic prefixes (و، ف، ب، ل، لل) attach directly to the next word:
 * "وباريس" → "باريس", "للقاهرة" → "القاهرة". Returns candidate forms.
 *
 * @param {string} normalized
 * @returns {string[]}
 */
function arabicVariants(normalized) {
  const variants = [normalized];
  if (!ARABIC_RANGE.test(normalized) || normalized.length < 4) return variants;
  if (normalized.startsWith('لل')) variants.push('ال' + normalized.slice(2));
  if (/^[وفبل]/.test(normalized)) {
    const stripped = normalized.slice(1);
    variants.push(stripped);
    if (stripped.startsWith('لل')) variants.push('ال' + stripped.slice(2));
    if (/^[وفبل]/.test(stripped) && stripped.length >= 4) variants.push(stripped.slice(1));
  }
  return variants;
}

/** Pre-built dictionary: normalised name/alias → canonical place. */
const PLACES_MAP = new Map();
const PLACES_BY_NAME = new Map();

for (const place of PLACES) {
  PLACES_BY_NAME.set(place.name, place);
  PLACES_MAP.set(normalizeToken(place.name), place);
}

for (const [alias, canonical] of Object.entries(PLACE_ALIASES)) {
  const place = PLACES_BY_NAME.get(canonical);
  if (!place) {
    throw new Error(`Place alias "${alias}" points to unknown place "${canonical}"`);
  }
  const key = normalizeToken(alias.replace(PUNCTUATION, ' ').trim().replace(/\s+/g, ' '));
  if (!PLACES_MAP.has(key)) PLACES_MAP.set(key, place);
}

/** Maximum number of words in any dictionary key. */
const MAX_NGRAM = Math.max(...Array.from(PLACES_MAP.keys(), (k) => k.split(' ').length));

/**
 * Look a place up by its canonical English name.
 *
 * @param {string} name
 * @returns {Place | undefined}
 */
export function getPlaceByName(name) {
  return PLACES_BY_NAME.get(name);
}

/**
 * Tokenise text into words, keeping the original form for capitalisation checks.
 *
 * @param {string} text
 * @returns {{ raw: string, norm: string }[]}
 */
function tokenize(text) {
  return text
    .replace(PUNCTUATION, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeToken(raw) }));
}

function isCapitalised(word) {
  const first = word.charAt(0);
  return first !== first.toLowerCase() && first === first.toUpperCase();
}

/**
 * Find every dictionary match in the text (longest phrases first, no overlaps).
 *
 * @param {{ raw: string, norm: string }[]} tokens
 * @returns {{ place: Place, start: number, end: number, raw: string }[]}
 */
function findMatches(tokens) {
  const matches = [];
  const used = new Array(tokens.length).fill(false);
  const hasTravelKeyword = tokens.some((t) => TRAVEL_KEYWORDS.has(t.norm));

  for (let size = Math.min(MAX_NGRAM, tokens.length); size >= 1; size--) {
    for (let i = 0; i + size <= tokens.length; i++) {
      let overlaps = false;
      for (let j = i; j < i + size; j++) if (used[j]) overlaps = true;
      if (overlaps) continue;

      const slice = tokens.slice(i, i + size);
      const candidates = size === 1 ? arabicVariants(slice[0].norm) : [slice.map((t) => t.norm).join(' ')];

      let place = null;
      for (const candidate of candidates) {
        place = PLACES_MAP.get(candidate);
        if (place) break;
      }
      if (!place) continue;

      const rawPhrase = slice.map((t) => t.raw).join(' ');
      const isArabic = ARABIC_RANGE.test(rawPhrase);
      const previous = i > 0 ? tokens[i - 1].norm : '';
      const hasCue = DESTINATION_CUES.has(previous) || NEUTRAL_CUES.has(previous) || ORIGIN_CUES.has(previous);

      if (size === 1 && !isArabic && AMBIGUOUS_NAMES.has(slice[0].norm)) {
        if (!isCapitalised(slice[0].raw) && !hasCue) continue;
        if (PERSON_NAMES.has(slice[0].norm) && !hasCue && !hasTravelKeyword) continue;
      }

      for (let j = i; j < i + size; j++) used[j] = true;
      matches.push({ place, start: i, end: i + size, raw: rawPhrase });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Extract the most likely destination mentioned in free text.
 *
 * Prefers phrases introduced by destination words ("to Paris") over origins
 * ("from Cairo"), and longer names over shorter ones ("New York" over "York").
 *
 * @param {string} text
 * @returns {(Place & { matchedText: string }) | null}
 */
export function extractPlaceFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const matches = findMatches(tokens);
  if (matches.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const match of matches) {
    const previous = match.start > 0 ? tokens[match.start - 1].norm : '';
    let score = 0;
    if (DESTINATION_CUES.has(previous)) score += 2;
    else if (NEUTRAL_CUES.has(previous)) score += 1;
    else if (ORIGIN_CUES.has(previous)) score -= 2;
    if (score > bestScore) {
      bestScore = score;
      best = match;
    }
  }

  return { ...best.place, matchedText: best.raw };
}

/**
 * @typedef {Object} Place
 * @property {string} name          Canonical English name
 * @property {string} country
 * @property {string} countryCode   ISO 3166-1 alpha-2
 * @property {string} flag          Emoji flag
 * @property {number} lat
 * @property {number} lon
 * @property {string} [wiki]        Wikipedia article title when it differs from `name`
 */
