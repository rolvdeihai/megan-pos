'use client';

import { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  CheckIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

interface Permission {
  code: string;
  label: string;
  description: string;
}

interface PermissionSelectorProps {
  permissions: Permission[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
}

// Group permissions by category
const PERMISSION_CATEGORIES: Record<string, string[]> = {
  'Dashboard & Laporan': [
    'view_dashboard',
    'view_reports',
  ],
  'Order & Meja': [
    'manage_orders',
  ],
  'Menu & Inventori': [
    'manage_menu',
    'manage_inventory',
  ],
  'Karyawan & Role': [
    'manage_staff',
  ],
  'Pengaturan & Billing': [
    'manage_settings',
    'manage_billing',
  ],
};

export default function PermissionSelector({
  permissions,
  selectedCodes,
  onChange,
}: PermissionSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(PERMISSION_CATEGORIES)
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const togglePermission = (code: string) => {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((c) => c !== code)
        : [...selectedCodes, code]
    );
  };

  const toggleAllInCategory = (category: string, codes: string[]) => {
    const allSelected = codes.every((code) => selectedCodes.includes(code));
    if (allSelected) {
      // Unselect all in category
      onChange(selectedCodes.filter((c) => !codes.includes(c)));
    } else {
      // Select all in category
      const newCodes = [...new Set([...selectedCodes, ...codes])];
      onChange(newCodes);
    }
  };

  const getPermissionInfo = (code: string): Permission | undefined => {
    return permissions.find((p) => p.code === code);
  };

  const selectedCount = selectedCodes.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
        <div className="flex items-center">
          <ShieldCheckIcon className="w-5 h-5 text-primary mr-2" />
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} permission dipilih
          </span>
        </div>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Permission Groups */}
      <div className="space-y-3 border rounded-lg overflow-hidden">
        {Object.entries(PERMISSION_CATEGORIES).map(([category, codes]) => {
          const isExpanded = expandedCategories.includes(category);
          const categoryPermissions = codes
            .map((code) => getPermissionInfo(code))
            .filter(Boolean) as Permission[];
          
          const selectedInCategory = codes.filter((code) =>
            selectedCodes.includes(code)
          ).length;
          const allSelected = selectedInCategory === codes.length;
          const someSelected = selectedInCategory > 0 && !allSelected;

          return (
            <div key={category} className="border-b last:border-b-0">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="relative mr-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={() => toggleAllInCategory(category, codes)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </div>
                  <span className="font-medium text-gray-900">{category}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({selectedInCategory}/{codes.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Permission List */}
              {isExpanded && (
                <div className="px-4 py-3 space-y-2 bg-white">
                  {categoryPermissions.map((permission) => (
                    <label
                      key={permission.code}
                      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCodes.includes(permission.code)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {permission.label}
                          </span>
                          {selectedCodes.includes(permission.code) && (
                            <CheckIcon className="w-4 h-4 text-primary ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {permission.description}
                        </p>
                        <code className="text-xs text-gray-400 mt-1 block">
                          {permission.code}
                        </code>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Permissions Preview */}
      {selectedCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            Permission yang Dipilih:
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedCodes.map((code) => {
              const perm = getPermissionInfo(code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {perm?.label || code}
                  <button
                    type="button"
                    onClick={() => togglePermission(code)}
                    className="ml-1 text-green-600 hover:text-green-900"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
