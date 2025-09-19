import React from 'react';
import { DataImporter } from '@/components/DataImporter';

const DataImport = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Importación de Datos CSV</h1>
      <DataImporter />
    </div>
  );
};

export default DataImport;