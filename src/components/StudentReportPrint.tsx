import { format } from "date-fns";

interface StudentResult {
  id: string;
  courseName: string;
  title: string;
  type: "Exam" | "Quiz";
  score: number;
  totalMark: number;
  percentage: number;
  date: string;
}

interface StudentReportPrintProps {
  studentName: string;
  studentId: string;
  results: StudentResult[];
}

export const printStudentReport = ({
  studentName,
  studentId,
  results,
}: StudentReportPrintProps) => {
  const quizResults = results.filter(r => r.type === "Quiz");
  const examResults = results.filter(r => r.type === "Exam");

  const avgQuiz = quizResults.length
    ? Math.round(quizResults.reduce((a, b) => a + b.percentage, 0) / quizResults.length)
    : 0;
  const avgExam = examResults.length
    ? Math.round(examResults.reduce((a, b) => a + b.percentage, 0) / examResults.length)
    : 0;
  const overallAvg = results.length
    ? Math.round(results.reduce((a, b) => a + b.percentage, 0) / results.length)
    : 0;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Report - ${studentName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #6366f1; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 14px; }
        .report-title { font-size: 22px; margin-top: 15px; color: #333; }
        .student-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .student-info h2 { font-size: 20px; margin-bottom: 10px; color: #333; }
        .student-info p { color: #666; font-size: 14px; margin: 5px 0; }
        .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .stat-box { text-align: center; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 12px; min-width: 140px; }
        .stat-box.quiz { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .stat-box.exam { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .stat-value { font-size: 32px; font-weight: bold; }
        .stat-label { font-size: 12px; text-transform: uppercase; margin-top: 5px; opacity: 0.9; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #333; border-left: 4px solid #6366f1; padding-left: 12px; }
        .section-title.quiz { border-color: #10b981; }
        .section-title.exam { border-color: #f59e0b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .score { font-weight: 600; }
        .score.pass { color: #10b981; }
        .score.fail { color: #ef4444; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge.quiz { background: #d1fae5; color: #059669; }
        .badge.exam { background: #fef3c7; color: #d97706; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px; }
        .print-date { color: #999; }
        @media print {
          body { padding: 20px; }
          .stat-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Haylat_EdTech</div>
        <div class="subtitle">AI-Powered Learning Platform</div>
        <div class="report-title">Student Performance Report</div>
      </div>

      <div class="student-info">
        <h2>${studentName}</h2>
        <p><strong>Student ID:</strong> ${studentId}</p>
        <p><strong>Report Generated:</strong> ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
      </div>

      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">${overallAvg}%</div>
          <div class="stat-label">Overall Average</div>
        </div>
        <div class="stat-box quiz">
          <div class="stat-value">${avgQuiz}%</div>
          <div class="stat-label">Quiz/Mid Average</div>
        </div>
        <div class="stat-box exam">
          <div class="stat-value">${avgExam}%</div>
          <div class="stat-label">Exam Average</div>
        </div>
      </div>

      ${quizResults.length > 0 ? `
        <div class="section">
          <div class="section-title quiz">Quiz / Mid Results (${quizResults.length} total)</div>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${quizResults.map(r => `
                <tr>
                  <td>${r.title}</td>
                  <td>${r.courseName}</td>
                  <td>${r.score}/${r.totalMark}</td>
                  <td><span class="score ${r.percentage >= 50 ? 'pass' : 'fail'}">${r.percentage}%</span></td>
                  <td>${r.date ? format(new Date(r.date), "MMM dd, yyyy") : "—"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${examResults.length > 0 ? `
        <div class="section">
          <div class="section-title exam">Exam Results (${examResults.length} total)</div>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${examResults.map(r => `
                <tr>
                  <td>${r.title}</td>
                  <td>${r.courseName}</td>
                  <td>${r.score}/${r.totalMark}</td>
                  <td><span class="score ${r.percentage >= 50 ? 'pass' : 'fail'}">${r.percentage}%</span></td>
                  <td>${r.date ? format(new Date(r.date), "MMM dd, yyyy") : "—"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <p>This is an official academic record from Haylat_EdTech</p>
        <p class="print-date">Printed on ${format(new Date(), "MMMM dd, yyyy")}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export default printStudentReport;
