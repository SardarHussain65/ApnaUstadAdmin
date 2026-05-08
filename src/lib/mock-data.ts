// Mock data for ApnaUstad admin
export type Status = "active" | "inactive";
export type BookingStatus = "pending" | "accepted" | "ongoing" | "completed" | "cancelled";
export type JobStatus = "open" | "assigned" | "reviewing" | "closed" | "cancelled";

export const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"];
export const CATEGORY_NAMES = ["Plumber", "Electrician", "Carpenter", "Painter", "Cleaner", "AC Technician", "Mason", "Welder"];

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export const categories: Category[] = [
  { id: "c1", name: "Plumber", icon: "🔧", color: "#00F5FF", description: "Pipe fitting, leakage repair, fixtures", sortOrder: 1, isActive: true },
  { id: "c2", name: "Electrician", icon: "⚡", color: "#FFD700", description: "Wiring, outlets, lighting, repairs", sortOrder: 2, isActive: true },
  { id: "c3", name: "Carpenter", icon: "🪵", color: "#FF8C00", description: "Furniture, doors, woodwork", sortOrder: 3, isActive: true },
  { id: "c4", name: "Painter", icon: "🎨", color: "#BF5AF2", description: "Interior & exterior painting", sortOrder: 4, isActive: true },
  { id: "c5", name: "Cleaner", icon: "🧹", color: "#34C759", description: "Home & office deep cleaning", sortOrder: 5, isActive: true },
  { id: "c6", name: "AC Technician", icon: "❄️", color: "#00FF7F", description: "AC install, service, gas refill", sortOrder: 6, isActive: true },
  { id: "c7", name: "Mason", icon: "🧱", color: "#FF1493", description: "Construction, tiles, plaster", sortOrder: 7, isActive: true },
  { id: "c8", name: "Welder", icon: "🔥", color: "#FF3B30", description: "Metal work, gates, grills", sortOrder: 8, isActive: false },
];

const NAMES = ["Muhammad Ali", "Fatima Khan", "Ahmed Raza", "Sara Malik", "Zubair Ahmed", "Ayesha Tariq", "Bilal Hussain", "Hina Sheikh", "Usman Iqbal", "Nadia Aslam", "Hamza Sultan", "Mariam Javed", "Imran Khalid", "Zara Saeed", "Faisal Riaz"];

const randPhone = () => `03${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}`;
const randCnic = () => `${Math.floor(10000 + Math.random() * 89999)}-${Math.floor(1000000 + Math.random() * 8999999)}-${Math.floor(Math.random() * 10)}`;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: Status;
  joinedAt: string;
  avatar: string;
}

export const users: User[] = Array.from({ length: 48 }, (_, i) => {
  const name = NAMES[i % NAMES.length];
  return {
    id: `U${1000 + i}`,
    name,
    phone: randPhone(),
    email: `${name.toLowerCase().replace(/ /g, ".")}${i}@apnaustad.pk`,
    city: pick(CITIES),
    address: `House ${i + 12}, Block ${pick(["A", "B", "C", "D"])}, Sector ${i % 9 + 1}`,
    status: Math.random() > 0.15 ? "active" : "inactive",
    joinedAt: daysAgo(Math.floor(Math.random() * 200)),
    avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
  };
});

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  city: string;
  address: string;
  bio: string;
  hourlyRate: number;
  experience: number;
  skills: string[];
  rating: number;
  totalJobs: number;
  totalEarnings: number;
  totalReviews: number;
  isVerified: boolean;
  isAvailable: boolean;
  status: Status;
  cnic: string;
  cnicFront: string;
  cnicBack: string;
  joinedAt: string;
  avatar: string;
}

export const workers: Worker[] = Array.from({ length: 36 }, (_, i) => {
  const name = NAMES[(i + 3) % NAMES.length];
  const verified = Math.random() > 0.3;
  return {
    id: `W${2000 + i}`,
    name,
    phone: randPhone(),
    email: `${name.toLowerCase().replace(/ /g, ".")}.ustad@apnaustad.pk`,
    category: pick(CATEGORY_NAMES),
    city: pick(CITIES),
    address: `Shop ${i + 5}, ${pick(["Main Bazaar", "Liberty Market", "Gulberg", "DHA Phase 5"])}`,
    bio: "Experienced professional with a track record of quality work and on-time delivery. Available across the city.",
    hourlyRate: 500 + Math.floor(Math.random() * 30) * 100,
    experience: 1 + Math.floor(Math.random() * 15),
    skills: ["Repair", "Installation", "Maintenance", "Inspection"].slice(0, 2 + Math.floor(Math.random() * 3)),
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    totalJobs: Math.floor(Math.random() * 250),
    totalEarnings: Math.floor(Math.random() * 800000) + 50000,
    totalReviews: Math.floor(Math.random() * 180),
    isVerified: verified,
    isAvailable: Math.random() > 0.3,
    status: Math.random() > 0.1 ? "active" : "inactive",
    cnic: randCnic(),
    cnicFront: `https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=70&auto=format`,
    cnicBack: `https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&q=70&auto=format`,
    joinedAt: daysAgo(Math.floor(Math.random() * 365)),
    avatar: `https://i.pravatar.cc/150?img=${((i + 20) % 70) + 1}`,
  };
});

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  workerId: string;
  workerName: string;
  category: string;
  scheduledAt: string;
  duration: number;
  subtotal: number;
  platformFee: number;
  total: number;
  workerEarning: number;
  paymentMethod: "card" | "cash" | "easypaisa";
  paymentStatus: "paid" | "unpaid";
  status: BookingStatus;
  type: "instant" | "scheduled";
  address: string;
  description: string;
  createdAt: string;
}

const STATUSES: BookingStatus[] = ["pending", "accepted", "ongoing", "completed", "cancelled"];
export const bookings: Booking[] = Array.from({ length: 80 }, (_, i) => {
  const subtotal = 500 + Math.floor(Math.random() * 240) * 100;
  const fee = Math.floor(subtotal * 0.1);
  const w = workers[i % workers.length];
  const u = users[i % users.length];
  return {
    id: `BK${5000 + i}`,
    customerId: u.id,
    customerName: u.name,
    workerId: w.id,
    workerName: w.name,
    category: w.category,
    scheduledAt: daysAgo(Math.floor(Math.random() * 30) - 5),
    duration: 1 + Math.floor(Math.random() * 5),
    subtotal,
    platformFee: fee,
    total: subtotal + fee,
    workerEarning: subtotal - fee,
    paymentMethod: pick(["card", "cash", "easypaisa"] as const),
    paymentStatus: Math.random() > 0.2 ? "paid" : "unpaid",
    status: pick(STATUSES),
    type: Math.random() > 0.5 ? "instant" : "scheduled",
    address: u.address + ", " + u.city,
    description: "Service request — needs urgent attention. Please arrive on time with required tools.",
    createdAt: daysAgo(Math.floor(Math.random() * 30)),
  };
});

export interface JobPost {
  id: string;
  customerId: string;
  customerName: string;
  category: string;
  description: string;
  urgency: "instant" | "scheduled";
  status: JobStatus;
  address: string;
  amount: number;
  postedAt: string;
  expiresAt: string;
  bidsCount: number;
}

const JOB_STATUSES: JobStatus[] = ["open", "assigned", "reviewing", "closed", "cancelled"];
export const jobs: JobPost[] = Array.from({ length: 40 }, (_, i) => {
  const u = users[i % users.length];
  return {
    id: `J${3000 + i}`,
    customerId: u.id,
    customerName: u.name,
    category: pick(CATEGORY_NAMES),
    description: "Need a skilled professional for urgent repair work at home. Multiple issues to be handled.",
    urgency: Math.random() > 0.5 ? "instant" : "scheduled",
    status: pick(JOB_STATUSES),
    address: u.address + ", " + u.city,
    amount: 1000 + Math.floor(Math.random() * 200) * 100,
    postedAt: daysAgo(Math.floor(Math.random() * 20)),
    expiresAt: daysAgo(-Math.floor(Math.random() * 7)),
    bidsCount: Math.floor(Math.random() * 12),
  };
});

export interface Review {
  id: string;
  customerName: string;
  workerName: string;
  rating: number;
  comment: string;
  bookingId: string;
  createdAt: string;
}

const COMMENTS = [
  "Excellent service! Very professional and arrived on time. Highly recommended.",
  "Good work but took a bit longer than expected. Quality was great though.",
  "Amazing Ustad! Fixed everything perfectly. Will book again.",
  "Average experience, nothing special. Got the job done.",
  "Outstanding! Best worker I've ever hired through this app.",
];
export const reviews: Review[] = Array.from({ length: 60 }, (_, i) => {
  const b = bookings[i % bookings.length];
  return {
    id: `R${4000 + i}`,
    customerName: b.customerName,
    workerName: b.workerName,
    rating: 1 + Math.floor(Math.random() * 5),
    comment: pick(COMMENTS),
    bookingId: b.id,
    createdAt: daysAgo(Math.floor(Math.random() * 60)),
  };
});

// Dashboard chart data
export const bookingsLast30Days = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  bookings: 8 + Math.floor(Math.random() * 25),
  revenue: 5000 + Math.floor(Math.random() * 25000),
}));

export const bookingStatusDistribution = [
  { name: "pending", value: bookings.filter(b => b.status === "pending").length, color: "#FFD700" },
  { name: "accepted", value: bookings.filter(b => b.status === "accepted").length, color: "#00F5FF" },
  { name: "ongoing", value: bookings.filter(b => b.status === "ongoing").length, color: "#FF8C00" },
  { name: "completed", value: bookings.filter(b => b.status === "completed").length, color: "#34C759" },
  { name: "cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#FF3B30" },
];

export const dashboardStats = {
  totalUsers: users.length,
  totalWorkers: workers.length,
  totalBookings: bookings.length,
  totalRevenue: bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.total, 0),
  usersChange: 12.4,
  workersChange: 8.2,
  bookingsChange: 23.7,
  revenueChange: 18.9,
};

export interface Notification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string;
  status: "delivered" | "pending" | "failed";
}
export const notifications: Notification[] = [
  { id: "N1", title: "New Categories Available!", body: "Check out our new home service categories.", target: "All Users", sentAt: daysAgo(1), status: "delivered" },
  { id: "N2", title: "Verification Reminder", body: "Complete your CNIC verification to start earning.", target: "All Workers", sentAt: daysAgo(3), status: "delivered" },
  { id: "N3", title: "Eid Special Discount", body: "Get 20% off on all bookings this week.", target: "All Users", sentAt: daysAgo(6), status: "delivered" },
];

export const fmtPKR = (n: number) => `₨${n.toLocaleString("en-PK")}`;
