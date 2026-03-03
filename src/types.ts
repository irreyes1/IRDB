import { LucideIcon } from 'lucide-react';

export interface SavedQuery {
  id: string;
  name: string;
  vendor: 'ERI' | 'HUA' | 'ZTE';
  technology: '2G' | '3G' | '4G' | '5G';
  sql: string;
}

export const MOCK_SAVED_QUERIES: SavedQuery[] = [
  {
    id: '1',
    name: 'High Traffic Sites',
    vendor: 'ERI',
    technology: '4G',
    sql: "SELECT s.name, k.traffic_erlang FROM sites s JOIN kpis k ON s.site_id = k.site_id WHERE s.vendor = 'ERI' AND s.technology = '4G' ORDER BY k.traffic_erlang DESC LIMIT 10"
  },
  {
    id: '2',
    name: 'Low Availability Alert',
    vendor: 'HUA',
    technology: '5G',
    sql: "SELECT s.name, k.availability FROM sites s JOIN kpis k ON s.site_id = k.site_id WHERE s.vendor = 'HUA' AND s.technology = '5G' AND k.availability < 98"
  },
  {
    id: '3',
    name: 'ZTE 2G Status',
    vendor: 'ZTE',
    technology: '2G',
    sql: "SELECT * FROM sites WHERE vendor = 'ZTE' AND technology = '2G'"
  },
  {
    id: '4',
    name: 'Average Throughput by Region',
    vendor: 'ERI',
    technology: '5G',
    sql: "SELECT s.region, AVG(k.throughput_mbps) as avg_throughput FROM sites s JOIN kpis k ON s.site_id = k.site_id WHERE s.vendor = 'ERI' AND s.technology = '5G' GROUP BY s.region"
  }
];
