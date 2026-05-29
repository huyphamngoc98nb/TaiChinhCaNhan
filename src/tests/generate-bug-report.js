import fs from 'fs';
import path from 'path';

function determineSeverity(errorMessage, testTitle) {
  const msg = (errorMessage + ' ' + testTitle).toLowerCase();
  if (
    msg.includes('back button') ||
    msg.includes('header') ||
    msg.includes('title') ||
    msg.includes('floated away') ||
    msg.includes('not fixed') ||
    msg.includes('not sticky') ||
    msg.includes('not click') ||
    msg.includes('navigation')
  ) {
    return 'P1';
  }
  if (
    msg.includes('overlap') ||
    msg.includes('cover') ||
    msg.includes('hide') ||
    msg.includes('hidden') ||
    msg.includes('clip') ||
    msg.includes('keyboard') ||
    msg.includes('viewport') ||
    msg.includes('scroll')
  ) {
    return 'P2';
  }
  return 'P3';
}

function generateReport() {
  const resultsPath = path.join(process.cwd(), 'playwright-report', 'results.json');
  const reportOutputPath = path.join(process.cwd(), 'bug_report.md');

  if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found at ${resultsPath}`);
    return;
  }

  const rawData = fs.readFileSync(resultsPath, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error('Failed to parse Playwright results JSON', e);
    return;
  }

  const failedTests = [];
  let totalTests = 0;
  let passedTests = 0;

  data.suites?.forEach(suite => {
    suite.suites?.forEach(subSuite => {
      subSuite.specs?.forEach(spec => {
        spec.tests?.forEach(test => {
          totalTests++;
          const lastResult = test.results?.[test.results.length - 1];
          if (lastResult) {
            if (lastResult.status === 'passed') {
              passedTests++;
            } else {
              const errorMsg = lastResult.errors?.map(e => e.message).join('\n') || 'Unknown error';
              const severity = determineSeverity(errorMsg, spec.title);
              
              const screenshotAttachment = lastResult.attachments?.find(a => a.name === 'screenshot');
              let screenshotPath = '';
              if (screenshotAttachment) {
                screenshotPath = screenshotAttachment.path;
              }

              failedTests.push({
                projectName: test.projectName,
                testTitle: spec.title,
                errorMsg,
                severity,
                screenshot: screenshotPath
              });
            }
          }
        });
      });
    });
  });

  let markdown = `# Mobile QA Test Report & Bug Logs\n\n`;
  markdown += `**Thời gian chạy test:** ${new Date().toLocaleString('vi-VN')}\n`;
  markdown += `**Tổng số test cases:** ${totalTests}\n`;
  markdown += `**Đạt (PASS):** ${passedTests} / ${totalTests}\n`;
  markdown += `**Lỗi phát hiện (FAIL):** ${failedTests.length}\n\n`;

  if (failedTests.length === 0) {
    markdown += `## 🎉 Kết quả: PASS\n`;
    markdown += `Không phát hiện bất kỳ lỗi nào liên quan đến sticky behavior, overlap, layout vỡ, hay scroll container trên các viewports di động đã thử nghiệm.\n`;
  } else {
    markdown += `## 🛑 Kết quả: FAIL (Phát hiện lỗi)\n\n`;
    markdown += `Dưới đây là danh sách chi tiết các bug được ghi nhận kèm mức độ ưu tiên:\n\n`;

    failedTests.forEach((bug, index) => {
      const cleanError = bug.errorMsg
        .replace(/\u001b\[\d+m/g, '') // remove ANSI colors
        .split('\n')[0]; // take first line of error

      markdown += `### Bug #${index + 1}: ${bug.testTitle} (${bug.projectName})\n`;
      markdown += `- **Mức độ nghiêm trọng (Severity):** **${bug.severity}**\n`;
      markdown += `- **Các bước tái hiện (Steps to reproduce):**\n`;
      markdown += `  1. Thiết lập giả lập thiết bị: ${bug.projectName}.\n`;
      markdown += `  2. Truy cập màn hình thêm giao dịch tại \`/transactions/new\`.\n`;
      if (bug.errorMsg.includes('overlap') || bug.errorMsg.includes('covered')) {
        markdown += `  3. Quan sát vị trí ban đầu của trường số tiền đầu tiên (Amount Input).\n`;
      } else if (bug.errorMsg.includes('floated away') || bug.errorMsg.includes('sticky')) {
        markdown += `  3. Cuộn trang/form từ đầu xuống cuối.\n`;
        markdown += `  4. Kiểm tra xem Header, Back Button, Selector loại giao dịch có bị trôi theo hay không.\n`;
      } else if (bug.errorMsg.includes('keyboard') || bug.errorMsg.includes('Save button is hidden')) {
        markdown += `  3. Focus vào trường Ghi chú (Note Input) để mở bàn phím ảo (viewport co lại).\n`;
        markdown += `  4. Kiểm tra xem nút Lưu (Save button) có bị che khuất hay vỡ layout không.\n`;
      } else if (bug.errorMsg.includes('navigated back')) {
        markdown += `  3. Cuộn xuống và click vào nút Back (Quay lại).\n`;
      } else {
        markdown += `  3. Thực hiện các thao tác nhập liệu và cuộn trang.\n`;
      }
      markdown += `- **Kết quả thực tế (Actual result):**\n`;
      markdown += `  \`${cleanError}\`\n`;
      markdown += `- **Kết quả kỳ vọng (Expected result):**\n`;
      if (bug.severity === 'P1') {
        markdown += `  - Header, Back Button, và Selector loại giao dịch phải luôn được cố định ở phía trên cùng của màn hình khi cuộn nội dung form.\n`;
        markdown += `  - Nút Back và Selector phải phản hồi và bấm được bình thường.\n`;
      } else if (bug.severity === 'P2') {
        markdown += `  - Vùng nội dung form phải được cuộn độc lập, không bị đè hay che khuất bởi vùng sticky header.\n`;
        markdown += `  - Nút Lưu (Save) hoặc các trường nhập liệu không bị che bởi bàn phím ảo hay bị cắt mất.\n`;
      } else {
        markdown += `  - Giao diện hiển thị cân đối, không lỗi font, overflow hay sai căn lề.\n`;
      }
      
      if (bug.screenshot) {
        markdown += `- **Ảnh chụp lỗi (Screenshot):** [Xem ảnh chụp màn hình](file:///${bug.screenshot.replace(/\\/g, '/')})\n`;
      }
      markdown += `\n---\n\n`;
    });
  }

  fs.writeFileSync(reportOutputPath, markdown, 'utf8');
  console.log(`Generated bug report at: ${reportOutputPath}`);
}

generateReport();
