'use client'

import DynamicPage, { DynamicPageConfig } from '@/components/DynamicPage'

const config: DynamicPageConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  apiEndpoint: '/api/location',
  primaryKey: 'location_id',
  pageTitle: 'Location Management',
  pageDescription: 'Manage organisational locations and rooms',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: false,
  addUrl: '/admin/location/addLocation',
  editUrl: '/admin/location/editLocation',
  searchFields: [{ key: 'name', label: 'Location Name' }],
  columns: [
    { key: 'location_id', label: 'Location ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'block', label: 'Block', sortable: true },
    { key: 'level', label: 'Level', sortable: true },
    { key: 'created_dt', label: 'Created Date', sortable: true }
  ],
  formFields: [
    { key: 'location_id', label: 'Location ID', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'block', label: 'Block', type: 'text' },
    { key: 'level', label: 'Level', type: 'number' }
  ]
}

export default function LocationRoomsPage() {
  return <DynamicPage config={config} />
}