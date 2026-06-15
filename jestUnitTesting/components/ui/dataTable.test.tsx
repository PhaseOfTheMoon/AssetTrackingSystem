import { render, screen, fireEvent } from '@testing-library/react'
import DataTable from '@/components/ui/dataTable'

jest.mock('@heroicons/react/24/outline', () => ({
  ChevronUpIcon: () => <svg />,
  ChevronDownIcon: () => <svg />,
  ChevronUpDownIcon: () => <svg />,
  MagnifyingGlassIcon: () => <svg />,
  ArrowPathIcon: () => <svg />,
  DocumentArrowDownIcon: () => <svg />,
  PlusIcon: () => <svg />,
  FunnelIcon: () => <svg />,
  PrinterIcon: () => <svg />,
  QrCodeIcon: () => <svg />,
  XMarkIcon: () => <svg />,
  InformationCircleIcon: () => <svg />
}))

const defaultProps = {
  title: 'Asset Listing',
  columns: [
    { key: 'asset_id', label: 'Asset ID' },
    { key: 'name', label: 'Name' }
  ],
  data: [
    { asset_id: 'A001', name: 'Laptop' },
    { asset_id: 'A002', name: 'Monitor' }
  ],
  currentPage: 1,
  totalPages: 1,
  totalItems: 2,
  recordsPerPage: 10,
  onPageChange: jest.fn()
}

describe('DataTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the table title', () => {
    render(<DataTable {...defaultProps} />)
    expect(screen.getByText('Asset Listing')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<DataTable {...defaultProps} />)
    expect(screen.getByText('Asset ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable {...defaultProps} />)
    expect(screen.getByText('A001')).toBeInTheDocument()
    expect(screen.getByText('Laptop')).toBeInTheDocument()
    expect(screen.getByText('A002')).toBeInTheDocument()
  })

  // empty table should show the fallback message
  it('shows "No data available" when data is empty', () => {
    render(<DataTable {...defaultProps} data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  // loading spinner must appear while data is being fetched
  it('shows loading spinner when loading is true', () => {
    render(<DataTable {...defaultProps} loading={true} />)
    expect(screen.getByText('Data table loading...')).toBeInTheDocument()
  })

  // Add button appears when enabled and onAdd is provided
  it('shows Add button when showAddButton is true', () => {
    render(
      <DataTable
        {...defaultProps}
        showAddButton={true}
        onAdd={jest.fn()}
        addButtonText="Add Asset"
      />
    )
    expect(screen.getByText('Add Asset')).toBeInTheDocument()
  })

  // clicking the Add button must call onAdd
  it('calls onAdd when the Add button is clicked', () => {
    const onAdd = jest.fn()
    render(
      <DataTable
        {...defaultProps}
        showAddButton={true}
        onAdd={onAdd}
        addButtonText="Add"
      />
    )
    fireEvent.click(screen.getByText('Add'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  // Search button must call onSearch
  it('calls onSearch when the Search button is clicked', () => {
    const onSearch = jest.fn()
    render(<DataTable {...defaultProps} onSearch={onSearch} />)
    fireEvent.click(screen.getByText('Search'))
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  // Reset button must call onReset
  it('calls onReset when the Reset button is clicked', () => {
    const onReset = jest.fn()
    render(<DataTable {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  // Previous button must be disabled on page 1
  it('disables the Previous button on the first page', () => {
    render(
      <DataTable {...defaultProps} currentPage={1} totalPages={3} totalItems={30} />
    )
    expect(screen.getByText('Previous')).toBeDisabled()
  })

  // Next button must be disabled on the last page
  it('disables the Next button on the last page', () => {
    render(
      <DataTable {...defaultProps} currentPage={1} totalPages={1} totalItems={2} />
    )
    expect(screen.getByText('Next')).toBeDisabled()
  })

  // record count summary must show correct range
  it('shows the record count summary', () => {
    render(
      <DataTable
        {...defaultProps}
        currentPage={1}
        totalItems={2}
        recordsPerPage={10}
        totalPages={1}
      />
    )
    expect(screen.getByText(/Record 1 to 2 of 2/)).toBeInTheDocument()
  })

  // pagination only renders when data.length > 0, so pass one row with totalItems=0
  it('shows "No records found" in pagination when totalItems is 0', () => {
    render(
      <DataTable
        {...defaultProps}
        data={[{ asset_id: 'A001', name: 'Laptop' }]}
        totalItems={0}
        totalPages={0}
      />
    )
    expect(screen.getByText('No records found')).toBeInTheDocument()
  })

  // Edit and Delete buttons appear for each row when actions are provided
  it('renders Edit and Delete buttons for each row', () => {
    const actions = { onEdit: jest.fn(), onDelete: jest.fn() }
    render(<DataTable {...defaultProps} actions={actions} />)
    expect(screen.getAllByText('Edit')).toHaveLength(2)
    expect(screen.getAllByText('Delete')).toHaveLength(2)
  })

  // clicking Edit must call onEdit with the correct row data
  it('calls onEdit with the correct row when Edit is clicked', () => {
    const onEdit = jest.fn()
    render(<DataTable {...defaultProps} actions={{ onEdit }} />)
    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(onEdit).toHaveBeenCalledWith({ asset_id: 'A001', name: 'Laptop' })
  })

  // clicking Delete must call onDelete with the correct row data
  it('calls onDelete with the correct row when Delete is clicked', () => {
    const onDelete = jest.fn()
    render(<DataTable {...defaultProps} actions={{ onDelete }} />)
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(onDelete).toHaveBeenCalledWith({ asset_id: 'A001', name: 'Laptop' })
  })
})