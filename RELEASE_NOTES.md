# v2.1.2

## Tóm tắt

Bản cập nhật 2.1.2 tối ưu trải nghiệm Android khi nhập ngân sách và chuẩn hóa hàng bộ lọc trên màn Lịch sử giao dịch, giúp các điều khiển gọn, cân đối và không bị bàn phím che khuất.

## Cải thiện

- Tối ưu biểu mẫu thêm/sửa ngân sách để trường số tiền luôn nằm trong vùng nhìn thấy khi bàn phím số mở, đồng thời hỗ trợ vùng an toàn và bố cục ngang trên màn hình thấp.
- Cho phép nút Quay lại đóng bàn phím nhập tiền trước, giữ focus ổn định và bổ sung mô tả trợ năng cho trường số tiền ngân sách.
- Đồng bộ hai bộ lọc thời gian trên màn Lịch sử giao dịch theo tỷ lệ 50/50, cùng chiều cao 44 px và thẳng mép với danh sách giao dịch.
- Cân đối hai nút điều hướng tháng, giữ vùng chạm 44 px và hiển thị trạng thái vô hiệu hóa mà không làm thay đổi hình học.
- Chỉ giữ thanh tiêu đề Lịch sử giao dịch ở trạng thái sticky và căn lại các giá trị tổng hợp thu, chi, số dư trên màn hình nhỏ.

## Sửa lỗi

- Sửa lỗi bàn phím số có thể che trường số tiền hoặc làm biểu mẫu ngân sách cuộn sai vị trí.
- Sửa lỗi bộ chọn Ngày, Tháng, Năm cao hơn bộ điều hướng tháng và trạng thái được chọn không giữ khoảng inset đồng đều.

## Thay đổi dữ liệu

- Không có migration, thay đổi schema hoặc thao tác dữ liệu bắt buộc sau khi cập nhật.
