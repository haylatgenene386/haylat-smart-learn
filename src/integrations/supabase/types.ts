export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      about_us_content: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_visible: boolean
          section_key: string
          social_links: Json | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key: string
          social_links?: Json | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key?: string
          social_links?: Json | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          branch_id: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          branch_id: string | null
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          branch_id: string | null
          channel_type: string
          created_at: string
          id: string
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          grade_target: number | null
          id: string
          is_published: boolean | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_target?: number | null
          id?: string
          is_published?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_target?: number | null
          id?: string
          is_published?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exam_answers: {
        Row: {
          attempt_id: string
          branch_id: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          marks_awarded: number
          question_id: string
          student_answer: string | null
        }
        Insert: {
          attempt_id: string
          branch_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number
          question_id: string
          student_answer?: string | null
        }
        Update: {
          attempt_id?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number
          question_id?: string
          student_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          allow_review: boolean
          branch_id: string | null
          created_at: string
          exam_id: string
          id: string
          is_auto_submitted: boolean
          percentage: number | null
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          total_marks: number | null
        }
        Insert: {
          allow_review?: boolean
          branch_id?: string | null
          created_at?: string
          exam_id: string
          id?: string
          is_auto_submitted?: boolean
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          total_marks?: number | null
        }
        Update: {
          allow_review?: boolean
          branch_id?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          is_auto_submitted?: boolean
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          branch_id: string | null
          correct_answer: string
          created_at: string
          exam_id: string
          id: string
          marks: number
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          branch_id?: string | null
          correct_answer: string
          created_at?: string
          exam_id: string
          id?: string
          marks?: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_text: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          branch_id?: string | null
          correct_answer?: string
          created_at?: string
          exam_id?: string
          id?: string
          marks?: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_retake_overrides: {
        Row: {
          created_at: string
          exam_id: string
          extra_retakes: number
          granted_by: string
          id: string
          override_reason: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          extra_retakes?: number
          granted_by: string
          id?: string
          override_reason?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          extra_retakes?: number
          granted_by?: string
          id?: string
          override_reason?: string | null
          student_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          access_password: string | null
          allow_retake: boolean
          branch_id: string | null
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_time: string | null
          grade_target: number | null
          id: string
          is_active: boolean
          max_retakes: number
          pass_percentage: number
          prevent_backtracking: boolean
          randomize_questions: boolean
          retake_wait_hours: number
          show_result_immediately: boolean
          start_time: string | null
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          access_password?: string | null
          allow_retake?: boolean
          branch_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          grade_target?: number | null
          id?: string
          is_active?: boolean
          max_retakes?: number
          pass_percentage?: number
          prevent_backtracking?: boolean
          randomize_questions?: boolean
          retake_wait_hours?: number
          show_result_immediately?: boolean
          start_time?: string | null
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          access_password?: string | null
          allow_retake?: boolean
          branch_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          grade_target?: number | null
          id?: string
          is_active?: boolean
          max_retakes?: number
          pass_percentage?: number
          prevent_backtracking?: boolean
          randomize_questions?: boolean
          retake_wait_hours?: number
          show_result_immediately?: boolean
          start_time?: string | null
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_courses: {
        Row: {
          assigned_at: string
          assigned_by: string
          course_id: string
          id: string
          instructor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          course_id: string
          id?: string
          instructor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          course_id?: string
          id?: string
          instructor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_invitations: {
        Row: {
          course_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          course_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: string
          token?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          ai_questions_enabled: boolean | null
          branch_id: string | null
          chapter: number
          chapter_id: string | null
          chapter_title: string
          content: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          file_type: string | null
          file_url: string | null
          grade: number
          id: string
          is_published: boolean | null
          lesson_number: number
          sort_order: number | null
          summary: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ai_questions_enabled?: boolean | null
          branch_id?: string | null
          chapter: number
          chapter_id?: string | null
          chapter_title: string
          content?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          file_url?: string | null
          grade: number
          id?: string
          is_published?: boolean | null
          lesson_number: number
          sort_order?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ai_questions_enabled?: boolean | null
          branch_id?: string | null
          chapter?: number
          chapter_id?: string | null
          chapter_title?: string
          content?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          file_url?: string | null
          grade?: number
          id?: string
          is_published?: boolean | null
          lesson_number?: number
          sort_order?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          branch_id: string | null
          chapter_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          extracted_text: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          grade_target: number | null
          id: string
          is_published: boolean
          key_concepts: Json | null
          status: string
          subject: string | null
          summary: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          branch_id?: string | null
          chapter_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          grade_target?: number | null
          id?: string
          is_published?: boolean
          key_concepts?: Json | null
          status?: string
          subject?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          branch_id?: string | null
          chapter_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          grade_target?: number | null
          id?: string
          is_published?: boolean
          key_concepts?: Json | null
          status?: string
          subject?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          branch_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          ai_detail_level: string | null
          ai_enabled: boolean | null
          ai_max_questions: number | null
          ai_model: string | null
          ai_prompt_template: string | null
          contact_email: string | null
          dark_mode: boolean | null
          default_language: string | null
          favicon_url: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          low_data_mode: boolean | null
          platform_name: string | null
          quiz_password: string | null
          slogan: string | null
          social_links: Json | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          ai_detail_level?: string | null
          ai_enabled?: boolean | null
          ai_max_questions?: number | null
          ai_model?: string | null
          ai_prompt_template?: string | null
          contact_email?: string | null
          dark_mode?: boolean | null
          default_language?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          low_data_mode?: boolean | null
          platform_name?: string | null
          quiz_password?: string | null
          slogan?: string | null
          social_links?: Json | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          ai_detail_level?: string | null
          ai_enabled?: boolean | null
          ai_max_questions?: number | null
          ai_model?: string | null
          ai_prompt_template?: string | null
          contact_email?: string | null
          dark_mode?: boolean | null
          default_language?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          low_data_mode?: boolean | null
          platform_name?: string | null
          quiz_password?: string | null
          slogan?: string | null
          social_links?: Json | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          full_name: string | null
          gender: string | null
          grade: number | null
          id: string
          is_deleted: boolean
          is_suspended: boolean
          payment_admin_comment: string | null
          payment_method: string | null
          payment_receipt_url: string | null
          payment_reference_number: string | null
          payment_status: string
          phone_number: string | null
          preferred_language: string | null
          student_id: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
          welcome_email_sent: boolean
          welcome_email_sent_at: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          full_name?: string | null
          gender?: string | null
          grade?: number | null
          id?: string
          is_deleted?: boolean
          is_suspended?: boolean
          payment_admin_comment?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference_number?: string | null
          payment_status?: string
          phone_number?: string | null
          preferred_language?: string | null
          student_id?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
          welcome_email_sent?: boolean
          welcome_email_sent_at?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          full_name?: string | null
          gender?: string | null
          grade?: number | null
          id?: string
          is_deleted?: boolean
          is_suspended?: boolean
          payment_admin_comment?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference_number?: string | null
          payment_status?: string
          phone_number?: string | null
          preferred_language?: string | null
          student_id?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
          welcome_email_sent?: boolean
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          approval_status: string | null
          branch_id: string | null
          correct_answer: string
          course_id: string | null
          created_at: string
          created_by: string | null
          decline_reason: string | null
          difficulty: string | null
          explanation: string | null
          grade: number | null
          id: string
          is_active: boolean | null
          lesson_id: string | null
          options: Json | null
          question_text: string
          question_type: string
          submitted_by: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          branch_id?: string | null
          correct_answer: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          difficulty?: string | null
          explanation?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean | null
          lesson_id?: string | null
          options?: Json | null
          question_text: string
          question_type?: string
          submitted_by?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          branch_id?: string | null
          correct_answer?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          difficulty?: string | null
          explanation?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean | null
          lesson_id?: string | null
          options?: Json | null
          question_text?: string
          question_type?: string
          submitted_by?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          answers: Json | null
          branch_id: string | null
          created_at: string
          grade: number | null
          id: string
          lesson_id: string | null
          score: number
          topic: string | null
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          branch_id?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          lesson_id?: string | null
          score: number
          topic?: string | null
          total: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          branch_id?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          lesson_id?: string | null
          score?: number
          topic?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_tokens: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_branch_admin: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_instructor: { Args: { _user_id: string }; Returns: boolean }
      is_instructor_for_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "student"
        | "super_admin"
        | "instructor"
        | "global_super_admin"
        | "branch_super_admin"
        | "branch_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "student",
        "super_admin",
        "instructor",
        "global_super_admin",
        "branch_super_admin",
        "branch_admin",
      ],
    },
  },
} as const
