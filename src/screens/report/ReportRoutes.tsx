// The business dashboard and the profit screen, loaded together only when one of them is opened.
import { DashboardScreen } from './DashboardScreen';
import { MoversScreen } from './MoversScreen';
import { ProfitScreen } from './ProfitScreen';

export default function ReportRoutes({ path }: { path: string }) {
  if (path === '/movers') return <MoversScreen />;
  return path === '/profit' ? <ProfitScreen /> : <DashboardScreen />;
}
