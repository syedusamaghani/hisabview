// The business dashboard and the profit screen, loaded together only when one of them is opened.
import { DashboardScreen } from './DashboardScreen';
import { MoversScreen } from './MoversScreen';
import { ProfitScreen } from './ProfitScreen';
import { ReportsScreen } from './ReportsScreen';

export default function ReportRoutes({ path }: { path: string }) {
  if (path === '/reports') return <ReportsScreen />;
  if (path === '/movers') return <MoversScreen />;
  return path === '/profit' ? <ProfitScreen /> : <DashboardScreen />;
}
