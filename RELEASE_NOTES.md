# v0.1.37

## Tóm tắt
Bản cập nhật này siết chặt quy trình Android Release để mọi bản phát hành luôn kèm ghi chú thay đổi chi tiết đã được commit cùng mã nguồn.

## Cải thiện
- Bắt buộc kiểm tra `RELEASE_NOTES.md`, version heading, phần tóm tắt và bullet thay đổi trước khi build Android.
- Dùng cùng một file release notes đã commit để tạo GitHub Release và metadata cập nhật trong `latest.json`.

## Sửa lỗi
- Loại bỏ fallback `Android release vX.Y.Z` để workflow không thể publish release thiếu nội dung thay đổi thực tế.
- Dừng workflow trước khi publish nếu metadata không có summary, structured sections hoặc flat release notes hợp lệ.
