/**
 * Hook centralizado para manejo de modales
 * Elimina redundancias encontradas en Products, RawMaterials, Reception, etc.
 */

import { useState, useCallback } from 'react';

export interface ModalState<T = Record<string, unknown>> {
  isOpen: boolean;
  data?: T;
  mode: 'create' | 'edit' | 'view' | 'delete' | 'custom';
}

export interface UseModalReturn<T = Record<string, unknown>> {
  modal: ModalState<T>;
  openModal: (mode: ModalState<T>['mode'], data?: T) => void;
  closeModal: () => void;
  isOpen: boolean;
  isCreating: boolean;
  isEditing: boolean;
  isViewing: boolean;
  isDeleting: boolean;
  data: T | undefined;
  mode: ModalState<T>['mode'];
}

/**
 * Hook para manejo centralizado de estados de modales
 */
export const useModal = <T = Record<string, unknown>>(initialState?: Partial<ModalState<T>>): UseModalReturn<T> => {
  const [modal, setModal] = useState<ModalState<T>>({
    isOpen: false,
    data: undefined,
    mode: 'create',
    ...initialState
  });

  const openModal = useCallback((mode: ModalState<T>['mode'], data?: T) => {
    setModal({
      isOpen: true,
      mode,
      data
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    modal,
    openModal,
    closeModal,
    isOpen: modal.isOpen,
    isCreating: modal.mode === 'create',
    isEditing: modal.mode === 'edit',
    isViewing: modal.mode === 'view',
    isDeleting: modal.mode === 'delete',
    data: modal.data,
    mode: modal.mode
  };
};

/**
 * Hook especializado para formularios CRUD
 */
export const useFormModal = <T = any>() => {
  const modal = useModal<T>();

  const openCreateModal = useCallback(() => {
    modal.openModal('create');
  }, [modal]);

  const openEditModal = useCallback((data: T) => {
    modal.openModal('edit', data);
  }, [modal]);

  const openViewModal = useCallback((data: T) => {
    modal.openModal('view', data);
  }, [modal]);

  const openDeleteModal = useCallback((data: T) => {
    modal.openModal('delete', data);
  }, [modal]);

  return {
    ...modal,
    openCreateModal,
    openEditModal,
    openViewModal,
    openDeleteModal
  };
};

/**
 * Hook para modales de confirmación
 */
export interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

export const useConfirmModal = () => {
  const [config, setConfig] = useState<ConfirmModalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openConfirmModal = useCallback((modalConfig: ConfirmModalConfig) => {
    setConfig(modalConfig);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfig(null);
    setIsLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!config) return;

    try {
      setIsLoading(true);
      await config.onConfirm();
      closeConfirmModal();
    } catch (error) {
      console.error('Error in confirmation action:', error);
      setIsLoading(false);
    }
  }, [config, closeConfirmModal]);

  return {
    isOpen: !!config,
    config,
    isLoading,
    openConfirmModal,
    closeConfirmModal,
    handleConfirm
  };
};

/**
 * Hook para modales de importación (usado en RawMaterials)
 */
export interface ImportModalState {
  isOpen: boolean;
  step: 'upload' | 'preview' | 'processing' | 'complete';
  file?: File;
  data?: Record<string, unknown>[];
  errors?: string[];
}

export const useImportModal = () => {
  const [state, setState] = useState<ImportModalState>({
    isOpen: false,
    step: 'upload'
  });

  const openImportModal = useCallback(() => {
    setState({
      isOpen: true,
      step: 'upload'
    });
  }, []);

  const closeImportModal = useCallback(() => {
    setState({
      isOpen: false,
      step: 'upload',
      file: undefined,
      data: undefined,
      errors: undefined
    });
  }, []);

  const setStep = useCallback((step: ImportModalState['step']) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const setFile = useCallback((file: File) => {
    setState(prev => ({ ...prev, file, step: 'preview' }));
  }, []);

  const setData = useCallback((data: Record<string, unknown>[], errors?: string[]) => {
    setState(prev => ({ ...prev, data, errors }));
  }, []);

  return {
    ...state,
    openImportModal,
    closeImportModal,
    setStep,
    setFile,
    setData
  };
};