package com.taixiucanhan.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "DocumentSaver")
public class DocumentSaverPlugin extends Plugin {
    @PluginMethod
    public void saveTextFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("File name is required.");
            return;
        }

        if (content == null) {
            call.reject("File content is required.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, "saveTextFileResult");
    }

    @PluginMethod
    public void saveTextFileToDownloads(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String directoryName = call.getString("directoryName", getAppLabel());

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("File name is required.");
            return;
        }

        if (content == null) {
            call.reject("File content is required.");
            return;
        }

        if (directoryName == null || directoryName.trim().isEmpty()) {
            directoryName = getAppLabel();
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveTextFileToDownloadsWithMediaStore(call, fileName, content, mimeType, directoryName);
            return;
        }

        saveTextFileToLegacyDownloads(call, fileName, content, directoryName);
    }

    @PluginMethod
    public void deleteSavedFile(PluginCall call) {
        String uriString = call.getString("uri");
        String path = call.getString("path");

        if (uriString != null && !uriString.trim().isEmpty()) {
            Uri uri = Uri.parse(uriString);
            if (!"file".equals(uri.getScheme())) {
                try {
                    int deletedCount = getContext().getContentResolver().delete(uri, null, null);
                    resolveDeletedFile(call, deletedCount > 0, deletedCount == 0);
                    return;
                } catch (Exception error) {
                    call.reject("Unable to delete saved file.", error);
                    return;
                }
            }
        }

        if (path != null && !path.trim().isEmpty()) {
            deleteSavedFileByPath(call, path);
            return;
        }

        resolveDeletedFile(call, false, true);
    }

    private String getAppLabel() {
        CharSequence label = getContext().getApplicationInfo().loadLabel(getContext().getPackageManager());
        return label != null ? label.toString() : "Expense Tracker";
    }

    private void saveTextFileToDownloadsWithMediaStore(
            PluginCall call,
            String fileName,
            String content,
            String mimeType,
            String directoryName
    ) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(
                MediaStore.MediaColumns.RELATIVE_PATH,
                Environment.DIRECTORY_DOWNLOADS + File.separator + directoryName
        );
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = null;

        try {
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("Unable to create file in Downloads.");
                return;
            }

            try (OutputStream outputStream = resolver.openOutputStream(uri, "wt")) {
                if (outputStream == null) {
                    throw new IllegalStateException("Unable to open Downloads file.");
                }

                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
            }

            ContentValues completedValues = new ContentValues();
            completedValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, completedValues, null, null);

            resolveSavedFile(call, uri.toString(), "Download/" + directoryName + "/" + fileName);
        } catch (Exception error) {
            if (uri != null) {
                resolver.delete(uri, null, null);
            }
            call.reject("Unable to save file to Downloads.", error);
        }
    }

    private void saveTextFileToLegacyDownloads(
            PluginCall call,
            String fileName,
            String content,
            String directoryName
    ) {
        File targetDirectory = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                directoryName
        );

        try {
            if (!targetDirectory.exists() && !targetDirectory.mkdirs()) {
                call.reject("Unable to create Downloads folder.");
                return;
            }

            File targetFile = new File(targetDirectory, fileName);
            try (OutputStream outputStream = new FileOutputStream(targetFile, false)) {
                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
            }

            resolveSavedFile(
                    call,
                    Uri.fromFile(targetFile).toString(),
                    "Download/" + directoryName + "/" + fileName
            );
        } catch (Exception error) {
            call.reject("Unable to save file to Downloads.", error);
        }
    }

    private void resolveSavedFile(PluginCall call, String uri, String path) {
        JSObject response = new JSObject();
        response.put("saved", true);
        response.put("uri", uri);
        response.put("path", path);
        call.resolve(response);
    }

    private void resolveDeletedFile(PluginCall call, boolean deleted, boolean missing) {
        JSObject response = new JSObject();
        response.put("deleted", deleted);
        if (missing) {
            response.put("missing", true);
        }
        call.resolve(response);
    }

    private void deleteSavedFileByPath(PluginCall call, String path) {
        try {
            File targetFile = resolveAllowedBackupFile(path);
            if (targetFile == null || !targetFile.exists()) {
                resolveDeletedFile(call, false, true);
                return;
            }

            resolveDeletedFile(call, targetFile.delete(), !targetFile.exists());
        } catch (Exception error) {
            call.reject("Unable to delete saved file.", error);
        }
    }

    private File resolveAllowedBackupFile(String rawPath) throws Exception {
        String normalizedPath = rawPath.replace('\\', '/').trim();
        File downloadsDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File allowedDirectory = new File(downloadsDirectory, "Expense Tracker");
        String allowedCanonicalPath = allowedDirectory.getCanonicalPath();

        File candidate;
        if (normalizedPath.startsWith("Download/Expense Tracker/")) {
            candidate = new File(downloadsDirectory, normalizedPath.substring("Download/".length()));
        } else if (normalizedPath.startsWith("Downloads/Expense Tracker/")) {
            candidate = new File(downloadsDirectory, normalizedPath.substring("Downloads/".length()));
        } else {
            candidate = new File(rawPath);
        }

        String candidateCanonicalPath = candidate.getCanonicalPath();
        if (
                candidateCanonicalPath.equals(allowedCanonicalPath) ||
                !candidateCanonicalPath.startsWith(allowedCanonicalPath + File.separator)
        ) {
            return null;
        }

        return candidate;
    }

    @ActivityCallback
    private void saveTextFileResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri uri = data != null ? data.getData() : null;
        String content = call.getString("content");

        if (uri == null || content == null) {
            call.reject("No destination file was selected.");
            return;
        }

        try (OutputStream outputStream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (outputStream == null) {
                call.reject("Unable to open selected file.");
                return;
            }

            outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();

            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("uri", uri.toString());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Unable to save file.", error);
        }
    }
}
