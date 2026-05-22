import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BranchProvider } from "@/hooks/useBranch";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import Quiz from "./pages/Quiz";
import AITutor from "./pages/AITutor";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import PendingVerification from "./pages/PendingVerification";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminChapters from "./pages/admin/AdminChapters";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminAI from "./pages/admin/AdminAI";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminExams from "./pages/admin/AdminExams";
import AdminExamQuestions from "./pages/admin/AdminExamQuestions";
import AdminExamResults from "./pages/admin/AdminExamResults";
import AdminResults from "./pages/admin/AdminResults";
import AdminAIQuestions from "./pages/admin/AdminAIQuestions";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminQuestionApproval from "./pages/admin/AdminQuestionApproval";
import AdminQuestionBank from "./pages/admin/AdminQuestionBank";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminApprovals from "./pages/admin/AdminApprovals";
import StudentExams from "./pages/StudentExams";
import TakeExam from "./pages/TakeExam";
import ExamHistory from "./pages/ExamHistory";
import ExamReview from "./pages/ExamReview";
import QuizHistory from "./pages/QuizHistory";
import Messages from "./pages/Messages";
import AcceptInvite from "./pages/AcceptInvite";
import Profile from "./pages/Profile";
import AboutUs from "./pages/AboutUs";
import StudentMaterials from "./pages/StudentMaterials";
import AdminAboutUs from "./pages/admin/AdminAboutUs";
import AdminEmailLogs from "./pages/admin/AdminEmailLogs";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorMaterials from "./pages/instructor/InstructorMaterials";
import InstructorQuestions from "./pages/instructor/InstructorQuestions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
           <BranchProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pending-verification" element={<PendingVerification />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
              <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
              <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
              <Route path="/quiz-history" element={<ProtectedRoute><QuizHistory /></ProtectedRoute>} />
              <Route path="/exams" element={<ProtectedRoute><StudentExams /></ProtectedRoute>} />
              <Route path="/materials" element={<ProtectedRoute><StudentMaterials /></ProtectedRoute>} />
              <Route path="/exams/:examId/take" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
              <Route path="/exam-history" element={<ProtectedRoute><ExamHistory /></ProtectedRoute>} />
              <Route path="/exams/review/:attemptId" element={<ProtectedRoute><ExamReview /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              {/* Instructor routes */}
              <Route path="/instructor" element={<ProtectedRoute requiredRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
              <Route path="/instructor/courses/:courseId/materials" element={<ProtectedRoute requiredRole="instructor"><InstructorMaterials /></ProtectedRoute>} />
              <Route path="/instructor/questions" element={<ProtectedRoute requiredRole="instructor"><InstructorQuestions /></ProtectedRoute>} />
              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/courses" element={<ProtectedRoute requiredRole="admin"><AdminCourses /></ProtectedRoute>} />
              <Route path="/admin/courses/:courseId/chapters" element={<ProtectedRoute requiredRole="admin"><AdminChapters /></ProtectedRoute>} />
              <Route path="/admin/courses/:courseId/chapters/:chapterId/lessons" element={<ProtectedRoute requiredRole="admin"><AdminLessons /></ProtectedRoute>} />
              <Route path="/admin/materials" element={<ProtectedRoute requiredRole="admin"><AdminMaterials /></ProtectedRoute>} />
              <Route path="/admin/exams" element={<ProtectedRoute requiredRole="admin"><AdminExams /></ProtectedRoute>} />
              <Route path="/admin/exams/:examId/questions" element={<ProtectedRoute requiredRole="admin"><AdminExamQuestions /></ProtectedRoute>} />
              <Route path="/admin/exam-results" element={<ProtectedRoute requiredRole="admin"><AdminExamResults /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute requiredRole="admin"><AdminResults /></ProtectedRoute>} />
              <Route path="/admin/leaderboard" element={<ProtectedRoute requiredRole="admin"><AdminLeaderboard /></ProtectedRoute>} />
              <Route path="/admin/instructors" element={<ProtectedRoute requiredRole="super_admin"><AdminInstructors /></ProtectedRoute>} />
              <Route path="/admin/branches" element={<ProtectedRoute requiredRole="super_admin"><AdminBranches /></ProtectedRoute>} />
              <Route path="/admin/question-approval" element={<ProtectedRoute requiredRole="super_admin"><AdminQuestionApproval /></ProtectedRoute>} />
              <Route path="/admin/approvals" element={<ProtectedRoute requiredRole="admin"><AdminApprovals /></ProtectedRoute>} />
              <Route path="/admin/question-bank" element={<ProtectedRoute requiredRole="admin"><AdminQuestionBank /></ProtectedRoute>} />
              <Route path="/admin/ai" element={<ProtectedRoute requiredRole="admin"><AdminAI /></ProtectedRoute>} />
              <Route path="/admin/ai-questions" element={<ProtectedRoute requiredRole="admin"><AdminAIQuestions /></ProtectedRoute>} />
              <Route path="/admin/quizzes" element={<ProtectedRoute requiredRole="admin"><AdminQuizzes /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requiredRole="super_admin"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/about-us" element={<ProtectedRoute requiredRole="super_admin"><AdminAboutUs /></ProtectedRoute>} />
              <Route path="/admin/email-logs" element={<ProtectedRoute requiredRole="super_admin"><AdminEmailLogs /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
           </BranchProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
