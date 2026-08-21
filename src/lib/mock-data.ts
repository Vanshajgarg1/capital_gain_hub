import { Course, FAQ, Testimonial, Enrollment, Payment, User } from "@/types";

export const MOCK_USER: User = {
  id: "u_123",
  email: "rahul@example.com",
  full_name: "Rahul Sharma",
  role: "STUDENT",
  created_at: new Date().toISOString(),
};

export const MOCK_ADMIN: User = {
  id: "a_123",
  email: "admin@capitalgainhub.com",
  full_name: "Admin User",
  role: "ADMIN",
  created_at: new Date().toISOString(),
};

export const MOCK_COURSES: Course[] = [
  {
    id: "c_1",
    title: "Trading Foundations",
    slug: "trading-foundations",
    description: "Learn the core mechanics of the stock market, order types, and basic price action.",
    thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop",
    price: 49,
    level: "Beginner",
    duration: "4 Hours",
    is_published: true,
    is_featured: false,
    student_count: 5430,
    created_at: new Date().toISOString(),
    modules: [
      {
        id: "m_1",
        course_id: "c_1",
        title: "Introduction to Financial Markets",
        order_index: 1,
        lessons: [
          { id: "l_1", module_id: "m_1", title: "What is the Stock Market?", description: "Basic concepts.", duration: 300, order_index: 1, is_free_preview: true },
          { id: "l_2", module_id: "m_1", title: "Understanding Order Types", description: "Market vs Limit.", duration: 420, order_index: 2, is_free_preview: true },
        ],
      },
      {
        id: "m_2",
        course_id: "c_1",
        title: "Understanding Price Action",
        order_index: 2,
        lessons: [
          { id: "l_3", module_id: "m_2", title: "Candlestick Anatomy", description: "Learn candlesticks.", duration: 600, order_index: 1, is_free_preview: false },
        ],
      },
    ],
  },
  {
    id: "c_2",
    title: "Technical Trading Mastery",
    slug: "technical-trading-mastery",
    description: "Master indicators, volume analysis, and advanced chart patterns for consistent gains.",
    thumbnail_url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop",
    price: 149,
    level: "Intermediate",
    duration: "12 Hours",
    is_published: true,
    is_featured: false,
    student_count: 3200,
    created_at: new Date().toISOString(),
  },
  {
    id: "c_3",
    title: "Advanced Trading Strategies",
    slug: "advanced-trading-strategies",
    description: "Options trading, futures, and institutional concepts like Smart Money Concepts.",
    thumbnail_url: "https://images.unsplash.com/photo-1642543492481-44e81e39148c?q=80&w=1200&auto=format&fit=crop",
    price: 299,
    level: "Advanced",
    duration: "20 Hours",
    is_published: true,
    is_featured: false,
    student_count: 1500,
    created_at: new Date().toISOString(),
  },
  {
    id: "c_4",
    title: "Complete Trading Program",
    slug: "complete-trading-program",
    description: "The ultimate bundle taking you from absolute beginner to professional trader.",
    thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop",
    price: 399,
    level: "Beginner → Advanced",
    duration: "45 Hours",
    is_published: true,
    is_featured: true, // Recommended option
    student_count: 8900,
    created_at: new Date().toISOString(),
  }
];

export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: "t_1",
    name: "Arjun Verma",
    student_type: "Beginner Trader",
    content: "Capital Gain Hub completely transformed my understanding of the market. The structured approach made complex concepts easy to grasp.",
    rating: 5,
    avatar_url: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
  },
  {
    id: "t_2",
    name: "Priya Desai",
    student_type: "Intermediate Trader",
    content: "I had some experience, but the technical mastery course fixed the flaws in my risk management. Highly recommended for serious learners.",
    rating: 5,
    avatar_url: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
  },
  {
    id: "t_3",
    name: "Karan Singh",
    student_type: "Advanced Options Trader",
    content: "The advanced strategies, particularly the institutional concepts, gave me a real edge in the market. Worth every penny.",
    rating: 4,
    avatar_url: "https://i.pravatar.cc/150?u=a04258114e29026702d"
  }
];

export const MOCK_FAQS: FAQ[] = [
  {
    id: "f_1",
    question: "Is this course suitable for beginners?",
    answer: "Absolutely. Our Trading Foundations course is designed specifically for people with zero prior knowledge of the financial markets."
  },
  {
    id: "f_2",
    question: "How long do I get access to the course?",
    answer: "Once enrolled, you get lifetime access to the course content, including all future updates and additions."
  },
  {
    id: "f_3",
    question: "Can I learn at my own pace?",
    answer: "Yes, all our content is pre-recorded and accessible 24/7 on your student dashboard, so you can learn whenever it suits your schedule."
  },
  {
    id: "f_4",
    question: "Is there a certificate?",
    answer: "Yes! Upon completing 100% of the modules in any paid course, you will receive a verifiable certificate of completion."
  }
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "e_1",
    user_id: "u_123",
    course_id: "c_1",
    enrolled_at: new Date().toISOString(),
    progress_percentage: 65,
  }
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "p_1",
    user_id: "u_123",
    course_id: "c_4",
    amount: 399,
    status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date().toISOString(),
  }
];
