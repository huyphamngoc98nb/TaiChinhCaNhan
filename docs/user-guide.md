# Hướng dẫn sử dụng Expense Tracker

Tài liệu này hướng dẫn các chức năng hiện có của Expense Tracker dành cho người dùng thông thường. Tên nút và mục menu được viết theo giao diện tiếng Việt của ứng dụng.

## 1. Giới thiệu

Expense Tracker giúp bạn quản lý tài chính cá nhân trên một thiết bị, gồm:

- Theo dõi số dư các ví và tài khoản.
- Ghi giao dịch thu, chi và chuyển khoản.
- Theo dõi ngân sách, hóa đơn định kỳ, khoản vay và khoản cho vay.
- Xem báo cáo, xuất PDF/CSV và sao lưu dữ liệu.

Ứng dụng hoạt động theo hướng **local-first**: dữ liệu nghiệp vụ chính được lưu trong SQLite trên thiết bị, không cần máy chủ để sử dụng các chức năng chính.

### Web và Android khác nhau thế nào?

- **Web:** SQLite chạy qua `jeep-sqlite` và được lưu trong IndexedDB của trình duyệt. Dữ liệu Web không có mức mã hóa SQLCipher tương đương bản native.
- **Android/native:** cơ sở dữ liệu được mở bằng SQLCipher sau khi xác thực PIN. Thiết bị hỗ trợ có thể dùng sinh trắc học để mở khóa.
- Một số chức năng liên quan đến camera, sinh trắc học, lưu hoặc chia sẻ tệp cần được kiểm tra và sử dụng trên thiết bị thật.

## 2. Bắt đầu sử dụng

### Mở ứng dụng và thiết lập PIN

Trên bản native, lần mở đầu tiên:

1. Nhập một mã PIN gồm 6 chữ số tại màn hình **Tạo mã PIN**.
2. Nhập lại mã PIN tại màn hình **Xác nhận mã PIN**.
3. Những lần mở sau, nhập đúng PIN để mở khóa ứng dụng.

Nếu sinh trắc học đã được bật trong **Cài đặt** và thiết bị hỗ trợ, bạn có thể dùng nút **Dùng sinh trắc học** để mở khóa.

> Không thể xem lại hoặc khôi phục PIN. Nếu quên PIN, chọn **Quên mã PIN?**, xác nhận xóa dữ liệu
> local, thiết lập PIN mới và khôi phục từ backup. Nếu không có backup, dữ liệu đã mã hóa có thể
> mất vĩnh viễn.

### Thiết lập ban đầu

Sau khi mở ứng dụng, vào **Thêm > Cài đặt** để chọn:

- **Giao diện:** Sáng, Tối hoặc Hệ thống.
- **Ngôn ngữ:** Tiếng Việt hoặc Tiếng Anh.
- **Tiền tệ:** đơn vị tiền hiển thị mặc định.
- **Mở khóa sinh trắc học:** chỉ bật được khi thiết bị native hỗ trợ.

Sau đó, nên tạo ít nhất một ví tại **Thêm > Ví** trước khi ghi giao dịch.

### Điều hướng chính

Thanh điều hướng dưới cùng gồm:

- **Trang chủ:** mở Dashboard.
- **Lịch sử:** xem lịch sử giao dịch.
- Nút dấu **+** ở giữa: tạo mới theo màn hình hiện tại. Tại Trang chủ và Lịch sử, nút này tạo giao dịch.
- **Ngân sách:** theo dõi và thiết lập ngân sách.
- **Thêm:** mở các mục Ví, Danh mục, Báo cáo, Hóa đơn định kỳ, Khoản vay, Xuất dữ liệu, Sao lưu và khôi phục, Cài đặt.

### Hiểu màn hình Dashboard

Dashboard hiển thị nhanh:

- **Tổng số dư**, các ví có số dư và nút ẩn/hiện số tiền.
- **Tổng tài sản**, **Dư nợ thẻ tín dụng**, **Thu nhập tháng này** và **Chi tiêu tháng này**.
- Hóa đơn sắp đến hạn hoặc quá hạn.
- Cảnh báo thẻ tín dụng sắp đến hạn, quá hạn hoặc gần hạn mức.
- Tiến độ các ngân sách nổi bật và số tiền còn lại.

Chạm vào khu vực hóa đơn, cảnh báo thẻ hoặc ngân sách để mở màn hình chi tiết tương ứng.

## 3. Quản lý ví

Ví đại diện cho nơi giữ tiền hoặc tài khoản cần theo dõi. Mở **Thêm > Ví** để xem danh sách ví.

### Tạo ví mới

1. Mở **Ví**.
2. Nhấn nút dấu **+**.
3. Nhập **Tên ví**.
4. Chọn **Loại tài khoản** và **Đơn vị tiền tệ**.
5. Nhập **Số dư ban đầu**. Với thẻ tín dụng, nhập **Dư nợ hiện tại**.
6. Chọn biểu tượng, màu và tùy chọn **Không tính vào tổng** nếu cần.
7. Nhấn **Tạo tài khoản**.

### Các loại ví

- **Tiền mặt:** tiền đang giữ trực tiếp.
- **Ngân hàng:** tài khoản thanh toán hoặc tiết kiệm tại ngân hàng.
- **Thẻ tín dụng:** theo dõi dư nợ, hạn mức, ngày sao kê, ngày đến hạn và phí thường niên.
- **Ví điện tử:** tài khoản tại các dịch vụ ví điện tử.
- **Đầu tư:** tài khoản hoặc danh mục đầu tư.
- **Khác:** các tài khoản không thuộc nhóm trên.

### Thẻ tín dụng

Khi chọn loại **Thẻ tín dụng**, bạn cần nhập **Hạn mức tín dụng**. Có thể nhập thêm:

- **Ngày sao kê** từ 1 đến 31.
- **Ngày đến hạn** từ 1 đến 31.
- **Phí thường niên**.

Dư nợ thẻ được theo dõi như một khoản nợ. Để ghi nhận thanh toán thẻ, tạo giao dịch **Chuyển khoản** từ ví thanh toán đến ví thẻ tín dụng.

### Chỉnh sửa ví và cập nhật số dư

1. Mở **Ví**.
2. Chạm vào ví cần sửa.
3. Thay đổi thông tin hoặc số dư.
4. Nhấn **Lưu thay đổi**.

Khi bạn sửa số dư, ứng dụng tự tạo một giao dịch **Cân bằng số dư** bằng phần chênh lệch. Giao dịch này được đánh dấu **Không tính vào tổng thu/chi**, vì vậy số dư ví được điều chỉnh nhưng báo cáo thu/chi không bị sai lệch.

### Không tính ví vào tổng

Bật **Không tính vào tổng** nếu bạn vẫn muốn theo dõi ví nhưng không muốn đưa số dư của ví đó vào tổng tài sản/tổng số dư. Danh sách ví sẽ hiển thị dấu hiệu cho các ví bị loại khỏi tổng.

### Xóa ví

Bạn chỉ có thể xóa ví khi ví không còn được dùng bởi giao dịch, hóa đơn, ngân sách, khoản vay hoặc lịch sử thanh toán khoản vay.

## 4. Quản lý giao dịch

### Tạo giao dịch chi

1. Tại **Trang chủ** hoặc **Lịch sử**, nhấn dấu **+**.
2. Chọn **Chi**.
3. Nhập số tiền.
4. Chọn ví và danh mục chi.
5. Chọn ngày giờ, nhập ghi chú nếu cần.
6. Có thể bật **Không tính vào tổng thu/chi** hoặc đính kèm ảnh hóa đơn.
7. Nhấn **Lưu**.

Ứng dụng trừ số tiền khỏi ví. Với ví thông thường, giao dịch sẽ bị từ chối nếu số dư không đủ.

### Tạo giao dịch thu

1. Nhấn dấu **+** và chọn **Thu**.
2. Nhập số tiền.
3. Chọn ví nhận tiền và danh mục thu.
4. Chọn ngày giờ, nhập ghi chú và ảnh hóa đơn nếu cần.
5. Nhấn **Lưu**.

Ứng dụng cộng số tiền vào ví đã chọn.

### Tạo giao dịch chuyển khoản

1. Nhấn dấu **+** và chọn **Chuyển khoản**.
2. Chọn ví nguồn.
3. Chọn **Ví nhận**.
4. Nhập số tiền, ngày giờ và ghi chú.
5. Nhấn **Lưu**.

Ví nguồn và ví nhận phải khác nhau. Chuyển khoản thay đổi số dư của cả hai ví nhưng không được tính là thu hoặc chi.

Khi ví nhận là thẻ tín dụng, giao dịch được xem là thanh toán thẻ tín dụng.

### “Không tính vào tổng thu/chi” dùng khi nào?

Tùy chọn **Không tính vào tổng thu/chi**:

- Vẫn làm thay đổi số dư ví.
- Không đưa giao dịch vào tổng thu/chi trên Dashboard, ngân sách và báo cáo.

Nên dùng cho giao dịch điều chỉnh, cân bằng số dư hoặc giao dịch bạn chủ động không muốn đưa vào báo cáo thu/chi. Không nên bật cho giao dịch thu hoặc chi thực tế hằng ngày.

### Đính kèm ảnh hóa đơn

Trong form giao dịch, chọn **Capture / Select Receipt** để chụp hoặc chọn ảnh. Khi đã có ảnh, nút đổi thành **Change Receipt**.

Lưu ý:

- Khả năng chụp/chọn ảnh phụ thuộc nền tảng và quyền của thiết bị.
- Backup JSON chỉ chứa đường dẫn ảnh hóa đơn, không đóng gói tệp ảnh vật lý.

### Chỉnh sửa hoặc xóa giao dịch

1. Mở **Lịch sử**.
2. Chạm vào giao dịch cần sửa.
3. Thay đổi thông tin rồi nhấn **Lưu**, hoặc chọn nút xóa và xác nhận.

Khi sửa hoặc xóa, ứng dụng điều chỉnh lại số dư các ví liên quan.

### Tìm kiếm và lọc giao dịch

Tại **Lịch sử**:

- Dùng nút tháng trước/tháng sau để đổi tháng.
- Chọn cách nhóm theo **Ngày**, **Tháng** hoặc **Năm**.
- Mở **Bộ lọc nâng cao** để lọc theo ghi chú, khoảng ngày, ví, loại giao dịch và danh mục.
- Chọn **Đặt lại bộ lọc** để trở về phạm vi tháng đang chọn.

## 5. Quản lý danh mục

Danh mục giúp phân loại giao dịch và làm cho ngân sách, báo cáo chính xác hơn.

### Tạo danh mục

1. Mở **Thêm > Danh mục**.
2. Chọn nhóm **Chi** hoặc **Thu**.
3. Nhấn dấu **+**.
4. Nhập tên, chọn loại, biểu tượng, mô tả và màu.
5. Nhấn **Lưu**.

### Sửa hoặc xóa danh mục

- Chạm vào thao tác sửa của danh mục, cập nhật thông tin rồi nhấn **Lưu**.
- Chọn xóa và xác nhận khi không còn cần danh mục.

### Phân biệt danh mục thu và chi

- Danh mục **Thu** chỉ xuất hiện khi tạo giao dịch thu.
- Danh mục **Chi** chỉ xuất hiện khi tạo giao dịch chi và khi thiết lập ngân sách.

Hãy dùng danh mục nhất quán. Ví dụ, không nên ghi cùng một loại chi tiêu lúc vào “Ăn uống”, lúc vào “Khác”, vì báo cáo theo danh mục sẽ bị phân tán.

## 6. Ngân sách

Ngân sách dùng để theo dõi giới hạn chi tiêu theo danh mục chi.

### Tạo ngân sách

1. Mở **Ngân sách**.
2. Nhấn dấu **+**.
3. Chọn một danh mục chi.
4. Chọn kỳ **Hàng tháng** hoặc **Hàng tuần**.
5. Chọn phạm vi:
   - **Tất cả ví**: tính chi tiêu từ mọi loại ví.
   - **Theo loại tài khoản**: chỉ tính chi tiêu từ loại tài khoản đã chọn.
6. Nhập số tiền ngân sách.
7. Nhấn **Lưu ngân sách**.

Form hiện tại không hỗ trợ chọn riêng một ví cụ thể; phạm vi khả dụng là tất cả ví hoặc một loại tài khoản.

### Theo dõi và chỉnh sửa ngân sách

- Màn hình **Ngân sách** hiển thị tổng quan và tiến độ từng danh mục.
- Nếu có ngân sách theo loại tài khoản, dùng tab **Theo loại tài khoản** để xem.
- Dashboard hiển thị các ngân sách nổi bật cùng phần trăm đã dùng và số tiền còn lại.
- Chạm vào một ngân sách để đổi số tiền, kỳ hoặc phạm vi.
- Chọn **Xóa ngân sách** để ngừng theo dõi ngân sách đó.

Giao dịch chi được đánh dấu **Không tính vào tổng thu/chi** sẽ không được tính vào ngân sách.

## 7. Hóa đơn định kỳ

Hóa đơn định kỳ giúp nhắc các khoản chi lặp lại hằng tháng.

### Tạo hóa đơn định kỳ

1. Mở **Thêm > Hóa đơn định kỳ**.
2. Nhấn dấu **+**.
3. Nhập tên và số tiền.
4. Chọn ví, danh mục chi và ngày đến hạn.
5. Nhập số ngày muốn nhắc trước.
6. Nhấn **Lưu**.

Hóa đơn hiện được lặp theo tháng.

### Theo dõi và quản lý hóa đơn

Danh sách hiển thị hóa đơn sắp đến hạn, đến hạn hôm nay, quá hạn hoặc đang tạm dừng.

- Chọn nút bật/tắt để **Tạm dừng** hoặc **Tiếp tục** hóa đơn.
- Chọn sửa để thay đổi thông tin.
- Chọn xóa để xóa hóa đơn.
- Với hóa đơn đến hạn hoặc quá hạn, chọn **Đã thanh toán** để chuyển ngày đến hạn sang tháng kế tiếp.

> **Đã thanh toán** chỉ chuyển hạn sang kỳ tiếp theo; ứng dụng không tự tạo giao dịch chi. Hãy tạo giao dịch chi riêng nếu muốn số dư và báo cáo phản ánh khoản thanh toán.

## 8. Khoản vay và cho vay

Mở **Thêm > Khoản vay** để theo dõi tiền bạn cho người khác vay hoặc tiền bạn vay.

### Tạo khoản vay/cho vay

1. Nhấn dấu **+**.
2. Chọn **Cho vay** hoặc **Đi vay**.
3. Nhập tên liên hệ và thông tin liên hệ nếu cần.
4. Chọn ví, nhập số tiền, ngày vay/cho vay, ngày đến hạn và ghi chú.
5. Nhấn **Lưu**.

Mặc định, ứng dụng tạo giao dịch liên kết và cập nhật số dư ví:

- **Cho vay:** tiền rời khỏi ví.
- **Đi vay:** tiền đi vào ví.

Nếu chỉ muốn theo dõi khoản vay mà không thay đổi số dư ví, bật **Bỏ qua cập nhật số dư ví**. Khi bật, bạn không cần chọn ví.

### Ghi nhận thanh toán

1. Chạm vào một khoản vay để mở chi tiết.
2. Chọn **Ghi nhận thanh toán**.
3. Chọn ví, nhập số tiền, ngày và ghi chú.
4. Lưu thanh toán.

Số tiền thanh toán không được vượt quá số tiền còn lại. Màn hình chi tiết hiển thị tiền gốc, đã thanh toán, còn lại, hạn thanh toán và lịch sử thanh toán.

Bạn cũng có thể sửa thông tin, hủy khoản vay, ẩn khỏi danh sách hoặc xóa vĩnh viễn. Xóa vĩnh viễn khoản có lịch sử thanh toán cần xác nhận thêm.

### Phân biệt với giao dịch thông thường

Nên tạo khoản vay trong mục **Khoản vay** thay vì tự ghi giao dịch thu/chi thông thường. Module khoản vay giữ được người liên hệ, hạn thanh toán, số tiền còn lại và lịch sử thanh toán.

## 9. Báo cáo

Mở **Thêm > Báo cáo** để xem tình hình tài chính trong một khoảng thời gian.

### Chọn khoảng thời gian

Dùng bộ chọn thời gian ở đầu màn hình để:

- Chọn kỳ báo cáo có sẵn hoặc khoảng ngày tùy chỉnh.
- Chọn độ chi tiết theo ngày, tháng hoặc mức được cung cấp trong bộ lọc.
- Đặt lại bộ lọc về mặc định.

### Nội dung báo cáo

Báo cáo gồm:

- Số dư ròng của kỳ và so sánh với kỳ trước.
- Tổng thu, tổng chi và xu hướng dòng tiền.
- Phân bổ chi tiêu theo danh mục.
- Phân bổ thu nhập theo nguồn.
- Các gợi ý như danh mục chi lớn nhất, ngày chi cao nhất và ví có giao dịch nhiều nhất.

Giao dịch chuyển khoản và giao dịch có bật **Không tính vào tổng thu/chi** không được tính vào tổng thu/chi, ngân sách và các phần tổng hợp báo cáo. Vì vậy tổng trên báo cáo có thể khác tổng giá trị của mọi dòng giao dịch trong lịch sử.

## 10. Xuất dữ liệu

Mở **Thêm > Xuất dữ liệu**, hoặc chọn biểu tượng xuất tại màn hình **Báo cáo**.

### Xuất PDF hoặc CSV

1. Chọn **Từ ngày** và **Đến ngày**.
2. Chọn:
   - **Báo cáo PDF** để tạo tài liệu có phần tổng hợp.
   - **Excel (CSV)** để tạo bảng dữ liệu giao dịch.
3. Chọn nơi lưu hoặc ứng dụng chia sẻ khi hệ thống yêu cầu.

Nếu khoảng ngày không có giao dịch, ứng dụng vẫn có thể tạo báo cáo tổng hợp.

### Xuất nhật ký lỗi

Chọn **Nhật ký lỗi (JSON)** để xuất lỗi ứng dụng và thông tin chẩn đoán đã lưu. Tệp này chủ yếu dùng khi cần kiểm tra sự cố.

Trên Android, quyền lưu/chia sẻ tệp và danh sách ứng dụng nhận tệp phụ thuộc thiết bị.

## 11. Backup và khôi phục dữ liệu

Mở **Thêm > Sao lưu và khôi phục**.

### Tạo backup JSON thủ công

1. Giữ tùy chọn **Mã hóa bản sao lưu** đang bật (mặc định).
2. Nhập mật khẩu bản sao lưu và xác nhận mật khẩu.
3. Chọn **Xuất bản sao lưu** rồi chọn nơi lưu tệp khi hệ thống yêu cầu.
4. Giữ tệp và mật khẩu ở nơi an toàn. Nếu quên mật khẩu, bản sao lưu đã mã hóa không thể khôi phục.

Bạn vẫn có thể tắt mã hóa để xuất backup plaintext nhằm tương thích với công cụ cũ, nhưng bất kỳ
ai truy cập được tệp plaintext đều có thể đọc nội dung.

Backup hiện bao gồm dữ liệu ví, danh mục, giao dịch, hóa đơn định kỳ, cài đặt ứng dụng, ngân sách, nhật ký lỗi, khoản vay và lịch sử thanh toán khoản vay.

Backup JSON chỉ chứa đường dẫn ảnh hóa đơn, không chứa tệp ảnh hóa đơn vật lý.

### Backup tự động

Trong màn hình backup:

1. Bật công tắc **Sao lưu tự động**.
2. Chọn chu kỳ **Hàng ngày**, **Hàng tuần** hoặc **Hàng tháng**.
3. Kiểm tra trạng thái, chu kỳ hiện tại và lần chạy gần nhất.

Ứng dụng kiểm tra và chạy backup đến hạn khi khởi động và khi mở màn hình backup.

Backup tự động hiện vẫn là plaintext vì ứng dụng không lưu mật khẩu backup. Hãy bảo vệ các tệp này
và không lưu chúng ở vị trí người khác có thể truy cập.

### Khôi phục từ backup

1. Tạo một backup mới trước khi khôi phục.
2. Chọn **Khôi phục dữ liệu**.
3. Đọc cảnh báo và xác nhận.
4. Chọn tệp JSON hợp lệ.
5. Nếu tệp đã mã hóa, nhập mật khẩu backup khi được yêu cầu.
6. Chờ ứng dụng hoàn tất và mở khóa lại.

> Khôi phục sẽ ghi đè dữ liệu hiện tại trong cơ sở dữ liệu. Thao tác được thực hiện theo transaction, nhưng bạn vẫn nên giữ một bản backup riêng trước khi bắt đầu.

### Bảo vệ tệp backup

SQLCipher chỉ bảo vệ cơ sở dữ liệu local trên thiết bị. Backup thủ công đã mã hóa bảo vệ riêng tệp
export bằng mật khẩu. Backup plaintext và backup tự động vẫn có thể bị đọc bằng công cụ thông thường
nếu còn tồn tại, vì vậy hãy xóa hoặc lưu chúng ở vị trí an toàn.

## 12. Cài đặt

Mở **Thêm > Cài đặt**.

### Giao diện

Chọn:

- **Sáng**.
- **Tối**.
- **Hệ thống** để theo giao diện của thiết bị.

### Ngôn ngữ và tiền tệ

- Chọn **Tiếng Việt** hoặc **Tiếng Anh**.
- Chọn đơn vị tiền tệ hiển thị mặc định.

Mỗi ví cũng có đơn vị tiền tệ riêng trong form ví. Cài đặt tiền tệ chung chủ yếu điều khiển cách hiển thị tại các khu vực dùng tiền tệ mặc định.

### Sinh trắc học

Nếu thiết bị native hỗ trợ, bật **Mở khóa sinh trắc học**. Ứng dụng yêu cầu xác thực trên thiết bị khi bật tính năng. Nếu sinh trắc học bị hủy hoặc không khả dụng, bạn vẫn có thể dùng PIN.

### Bảo mật và PIN

Khu vực **Bảo mật** hiển thị trạng thái bảo vệ local. Trên native, bạn có thể:

- Đổi PIN bằng cách nhập PIN hiện tại và xác nhận PIN mới. Đổi PIN sẽ tắt sinh trắc học cho đến khi bật lại.
- Chọn **Xóa dữ liệu local và thiết lập lại**. Thao tác này yêu cầu đánh dấu xác nhận và nhập `RESET`; file backup đã export không bị xóa.

Trên Web, dữ liệu dùng IndexedDB/jeep-sqlite và không có lớp mở khóa SQLCipher/PIN như native.

### Các lối tắt khác

Màn hình Cài đặt cũng có lối tắt đến Ví, Danh mục, Báo cáo, Hóa đơn định kỳ, Xuất dữ liệu và Sao lưu/khôi phục.

Chẩn đoán cơ sở dữ liệu chỉ hiển thị trong môi trường phát triển.

## 13. Lưu ý bảo mật và dữ liệu

- Dữ liệu nghiệp vụ chính được lưu cục bộ trên thiết bị.
- Web lưu SQLite trong IndexedDB và không có mức mã hóa SQLCipher tương đương bản native.
- Trên native, cơ sở dữ liệu được mở bằng SQLCipher sau khi xác thực PIN.
- PIN không được lưu trực tiếp trong mã ứng dụng hoặc local storage.
- Mất PIN có thể làm dữ liệu native đã mã hóa không thể truy cập.
- Backup thủ công nên được mã hóa bằng mật khẩu; backup plaintext và backup tự động cần được người dùng tự bảo vệ.
- Xóa dữ liệu trình duyệt có thể làm mất dữ liệu bản Web nếu chưa có backup.
- Backup không đóng gói tệp ảnh hóa đơn vật lý.

Xem thêm [Ghi chú bảo mật](security.md) để hiểu giới hạn bảo mật hiện tại.

## 14. Câu hỏi thường gặp

### Vì sao số dư ví không đúng?

Kiểm tra lịch sử giao dịch của ví, đặc biệt là giao dịch thu, chi, chuyển khoản và **Cân bằng số dư**. Khi sửa trực tiếp số dư ví, ứng dụng tự tạo giao dịch cân bằng bằng phần chênh lệch.

### Khi nào nên dùng “Không tính vào tổng thu/chi”?

Dùng cho giao dịch điều chỉnh hoặc giao dịch vẫn cần thay đổi số dư ví nhưng không muốn đưa vào tổng thu/chi, ngân sách và báo cáo. Không nên dùng cho thu nhập hoặc chi tiêu thực tế.

### “Không tính vào tổng” của ví có giống “Không tính vào tổng thu/chi” của giao dịch không?

Không. Tùy chọn của ví loại số dư ví khỏi tổng tài sản/tổng số dư. Tùy chọn của giao dịch loại giao dịch khỏi tổng thu/chi, ngân sách và báo cáo nhưng vẫn thay đổi số dư ví.

### Backup có bao gồm ảnh hóa đơn không?

Không. Backup JSON chỉ chứa đường dẫn ảnh hóa đơn, không chứa tệp ảnh vật lý.

### Restore có làm mất dữ liệu hiện tại không?

Có. Khôi phục ghi đè dữ liệu hiện tại. Luôn tạo và giữ một backup mới trước khi restore.

### Web và Android khác nhau ở điểm nào?

Web lưu dữ liệu qua SQLite/IndexedDB và không có mã hóa SQLCipher tương đương native. Android/native có thể dùng SQLCipher, PIN, sinh trắc học và khả năng lưu/chia sẻ tệp của thiết bị.

### Vì sao báo cáo không khớp với tổng giao dịch?

Báo cáo chỉ tính giao dịch thu và chi hợp lệ trong khoảng thời gian đã chọn. Giao dịch chuyển khoản và giao dịch bật **Không tính vào tổng thu/chi** không được tính vào tổng báo cáo.

### Vì sao ngân sách không tăng sau một giao dịch chi?

Kiểm tra:

- Giao dịch có đúng danh mục chi của ngân sách không.
- Giao dịch có nằm trong kỳ tuần/tháng hiện tại không.
- Phạm vi ngân sách có khớp loại tài khoản của ví không.
- Giao dịch có bật **Không tính vào tổng thu/chi** không.

### Nhấn “Đã thanh toán” hóa đơn có trừ tiền khỏi ví không?

Không. Nút này chỉ chuyển hạn hóa đơn sang tháng kế tiếp. Bạn cần tạo giao dịch chi riêng để cập nhật số dư và báo cáo.
