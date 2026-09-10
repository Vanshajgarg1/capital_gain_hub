export type Role = "ADMIN" | "STUDENT";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  phone?: string | null;
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
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  overview_heading?: string;
  overview_description?: string;
  learning_outcomes: string[];
  features: string[];
  instructor_details?: {
    name?: string;
    role?: string;
    bio?: string;
    avatar_url?: string;
  } | null;
  modules?: Module[];
  student_count?: number;
}

export interface CreateCourseInput {
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  price: number;
  level: string;
  duration: string;
  is_published: boolean;
  is_featured: boolean;
  overview_heading?: string;
  overview_description?: string;
  learning_outcomes?: string[];
  features?: string[];
  instructor_details?: {
    name?: string;
    role?: string;
    bio?: string;
    avatar_url?: string;
  } | null;
}

export type UpdateCourseInput = Partial<CreateCourseInput> & {
  is_archived?: boolean;
};

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  order_index: number;
}

export type UpdateModuleInput = Partial<CreateModuleInput>;

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_provider?: string;
  video_id?: string;
  video_asset_id?: string | null;
  duration: number; // in seconds
  order_index: number;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLessonInput {
  module_id: string;
  title: string;
  description: string;
  video_provider?: string;
  video_id?: string;
  video_asset_id?: string | null;
  duration: number;
  order_index: number;
  is_free_preview: boolean;
}

export type UpdateLessonInput = Partial<Omit<CreateLessonInput, "module_id">>;

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percentage?: number;
  course?: Course;
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

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  last_watched_position: number;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}
