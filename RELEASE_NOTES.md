# v0.1.38

## Tóm tắt
Bản cập nhật hoàn thiện cơ chế App Lock trên Android, bảo vệ dữ liệu tài chính khi ứng dụng ở nền và cho phép người dùng tùy chỉnh thời gian tự động khóa mà vẫn giữ nguyên màn hình đang thao tác.

## Bảo mật
- Hoàn thiện App Lock qua kiểm thử tích hợp: loại bỏ đường mở khóa cưỡng bức và listener cũ, không tính system dialog/file picker là thời gian background, hủy xác thực thao tác nhạy cảm khi ứng dụng rời foreground và ngăn sinh trắc học bật lặp do render lại.
- Có thể chọn thời gian tự động khóa trong phần Bảo mật: ngay lập tức, 30 giây, 1/2/5/15 phút hoặc không tự động khóa. Mặc định vẫn là 2 phút; khóa thiết bị luôn yêu cầu mở khóa lại bất kể lựa chọn này.
- Thêm xác thực tăng cường trước khi xuất dữ liệu, khôi phục ghi đè, xóa toàn bộ dữ liệu và tắt mở khóa sinh trắc học. Xác thực ưu tiên sinh trắc học, cho phép dùng PIN dự phòng, chỉ được tái sử dụng trong 5 phút của cùng phiên foreground; khôi phục, xóa dữ liệu và đổi PIN luôn yêu cầu xác thực mới.
- Chuẩn hóa trạng thái App Lock và sửa lỗi ứng dụng yêu cầu mở khóa chỉ vì mở Recent Apps, chuyển ứng dụng hoặc tạm mất focus. App Lock và đăng xuất tiếp tục là hai luồng độc lập; màn hình và dữ liệu đang nhập được giữ nguyên khi quay lại.
- App Lock hiện chỉ yêu cầu mở khóa sau khi ứng dụng ở nền từ 2 phút trở lên. Quay lại sớm hơn tiếp tục đúng màn hình hiện tại; mở khóa sau timeout vẫn giữ nguyên route và dữ liệu form đang nhập.
- Khóa hoặc tắt màn hình thiết bị Android giờ luôn yêu cầu mở khóa ứng dụng khi quay lại, kể cả chưa đủ 2 phút. Recent Apps, bảng thông báo, hộp thoại hệ thống và xác thực sinh trắc học không bị nhận nhầm là khóa thiết bị.
- Recent Apps giờ chỉ hiển thị lớp che trung tính với biểu tượng ứng dụng, không để lộ số dư, giao dịch, báo cáo hay dữ liệu form. Quay lại ứng dụng vẫn giữ nguyên màn hình và dữ liệu đang thao tác.
- Các màn hình PIN, cài đặt bảo mật và sao lưu/khôi phục được chặn chụp màn hình trên Android; các màn hình thông thường vẫn có thể dùng chức năng chụp/xuất báo cáo.
