export type Role = "ADMIN" | "STUDENT";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  price: number;
  level: "Beginner" | "Intermediate" | "Advanced" | "Beginner → Advanced";
  duration: string; // e.g., "12 Hours"
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  modules?: Module[];
  student_count?: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url?: string; // Mux or Bunny Stream URL placeholder
  duration: number; // in seconds
  order_index: number;
  is_free_preview: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percentage: number;
}

export interface Payment {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";
  payment_method: string;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar_url: string;
  student_type: string;
  content: string;
  rating: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}
