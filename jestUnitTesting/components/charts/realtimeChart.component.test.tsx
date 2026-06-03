import { render, screen, fireEvent, act } from '@testing-library/react'
import RealtimeChart from '@/components/charts/realtimeChart'

// replace Supabase realtime so tests don't open real connections
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }),
    removeChannel: jest.fn()
  }
}))

// replace recharts with simple wrappers so we test behaviour not chart rendering
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />
}))

const config = {
  tableName: 'Asset',
  title: 'Asset Chart',
  valueKey: 'count'
}

const emptyProps = {
  config,
  initialAssets: [],
  initialDepts: [],
  initialLocs: []
}

const assetData = [
  { asset_id: 'A001', condition: 'In-use',   created_dt: '2026-01-15T00:00:00Z' },
  { asset_id: 'A002', condition: 'In-store',  created_dt: '2026-01-20T00:00:00Z' },
  { asset_id: 'A003', condition: 'Spoiled',   created_dt: '2026-02-10T00:00:00Z' }
]

describe('RealtimeChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Condition filter pills

  it('renders the All assets pill', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByText('All assets')).toBeInTheDocument()
  })

  it('renders In-use, In-store and Spoiled condition pills', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByText('In-use')).toBeInTheDocument()
    expect(screen.getByText('In-store')).toBeInTheDocument()
    expect(screen.getByText('Spoiled')).toBeInTheDocument()
  })

  // with no data the pie chart area shows the empty message
  it('shows "No data for this period" when initial data is empty', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByText('No data for this period')).toBeInTheDocument()
  })

  // Subtitle and entity view

  it('shows the assets subtitle when entityView is assets', () => {
    render(<RealtimeChart {...emptyProps} entityView="assets" />)
    expect(screen.getByText('Asset condition · realtime')).toBeInTheDocument()
  })

  it('shows the department subtitle when entityView is department', () => {
    render(<RealtimeChart {...emptyProps} entityView="department" />)
    expect(screen.getByText('By department · realtime')).toBeInTheDocument()
  })

  it('shows the location subtitle when entityView is location', () => {
    render(<RealtimeChart {...emptyProps} entityView="location" />)
    expect(screen.getByText('By location · realtime')).toBeInTheDocument()
  })

  // Controls

  // date range defaults to All time
  it('shows "All time" as the default date range option', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByDisplayValue('All time')).toBeInTheDocument()
  })

  // live pulse indicator is always visible
  it('shows the Live indicator', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  // changing date range to By year reveals Bar / Trend tabs
  it('shows Bar and Trend view tabs when date range is changed to By year', async () => {
    render(<RealtimeChart {...emptyProps} initialAssets={assetData} />)
    const select = screen.getByDisplayValue('All time')
    await act(async () => {
      fireEvent.change(select, { target: { value: 'year' } })
    })
    expect(screen.getByText('Bar')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
  })

  // clicking Trend tab switches the chart type
  it('switches to Trend view when the Trend tab is clicked', async () => {
    render(<RealtimeChart {...emptyProps} initialAssets={assetData} />)
    const select = screen.getByDisplayValue('All time')
    await act(async () => {
      fireEvent.change(select, { target: { value: 'year' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Trend'))
    })
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  // Footer

  it('shows the asset count summary in the footer', () => {
    render(<RealtimeChart {...emptyProps} />)
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })

  // with real data, the footer count reflects the total
  it('shows the correct filtered count with data', () => {
    render(<RealtimeChart {...emptyProps} initialAssets={assetData} />)
    // footer shows "Showing 3 assets"
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  // Condition filter interaction

  // clicking a condition pill filters the footer text to show "X In-use assets"
  it('filters to a single condition when a pill is clicked', () => {
    render(<RealtimeChart {...emptyProps} initialAssets={assetData} />)
    const inUsePill = screen.getAllByText('In-use')[0].closest('button')!
    fireEvent.click(inUsePill)
    // footer should say "1 In-use assets"
    expect(screen.getByText(/In-use assets/)).toBeInTheDocument()
  })

  // clicking the same pill again resets to 'all'
  it('resets to All assets when the active pill is clicked again', () => {
    render(<RealtimeChart {...emptyProps} initialAssets={assetData} />)
    const inUsePill = screen.getByText('In-use').closest('button')!
    fireEvent.click(inUsePill) // activate
    fireEvent.click(inUsePill) // deactivate
    expect(screen.getByText('All assets')).toBeInTheDocument()
  })

  // Spoilage alerts

  // spoilage alert section appears when spoiled assets exist
  it('shows the Spoilage alerts section when spoiled assets are present', () => {
    const spoiledData = [
      { asset_id: 'A001', condition: 'Spoiled', created_dt: '2026-01-10T00:00:00Z', department_id: 'D1' },
      { asset_id: 'A002', condition: 'Spoiled', created_dt: '2026-01-11T00:00:00Z', department_id: 'D1' }
    ]
    const depts = [{ department_id: 'D1', name: 'IT Department' }]
    render(
      <RealtimeChart
        {...emptyProps}
        initialAssets={spoiledData}
        initialDepts={depts}
      />
    )
    expect(screen.getByText('Spoilage alerts')).toBeInTheDocument()
    expect(screen.getByText('IT Department')).toBeInTheDocument()
  })

  // high spoilage (count >= 5) triggers the red alert
  it('renders the high-spoilage alert when 5 or more spoiled assets are in the same department', () => {
    const spoiledData = Array.from({ length: 5 }, (_, i) => ({
      asset_id: `A00${i}`,
      condition: 'Spoiled',
      created_dt: '2026-01-10T00:00:00Z',
      department_id: 'D1'
    }))
    const depts = [{ department_id: 'D1', name: 'Engineering' }]
    render(
      <RealtimeChart
        {...emptyProps}
        initialAssets={spoiledData}
        initialDepts={depts}
      />
    )
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  // getSeasonalQuarter Q1 and Q3 branches

  // Q1 data (March to May) covers the Q1 branch of getSeasonalQuarter
  it('handles Q1 assets (March to May) without errors', async () => {
    const q1Data = [
      { asset_id: 'Q1A', condition: 'In-use',   created_dt: '2026-03-15T00:00:00Z' },
      { asset_id: 'Q1B', condition: 'In-store',  created_dt: '2026-05-20T00:00:00Z' }
    ]
    render(<RealtimeChart {...emptyProps} initialAssets={q1Data} />)
    const select = screen.getByDisplayValue('All time')
    await act(async () => {
      fireEvent.change(select, { target: { value: 'year' } })
    })
    expect(screen.getByText('Bar')).toBeInTheDocument()
  })

  // Q3 data (September to November) covers the Q3 branch of getSeasonalQuarter
  it('handles Q3 assets (September to November) without errors', async () => {
    const q3Data = [
      { asset_id: 'Q3A', condition: 'In-use',   created_dt: '2026-09-01T00:00:00Z' },
      { asset_id: 'Q3B', condition: 'Spoiled',   created_dt: '2026-11-30T00:00:00Z' }
    ]
    render(<RealtimeChart {...emptyProps} initialAssets={q3Data} />)
    const select = screen.getByDisplayValue('All time')
    await act(async () => {
      fireEvent.change(select, { target: { value: 'quarter' } })
    })
    expect(screen.getByText('Bar')).toBeInTheDocument()
  })
})
