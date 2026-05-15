import { appRepositories } from '@/core/repositories/app-repositories';
import { BuildExportDatasetUseCase } from '@/modules/export/services/build-export-dataset';

export const buildExportDatasetUseCase = new BuildExportDatasetUseCase(
  appRepositories.report,
  appRepositories.transaction
);
