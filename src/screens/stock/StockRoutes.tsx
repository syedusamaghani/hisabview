// All the Saman screens, loaded together only when the Saman tab (or a Kharid / Bikri button) is opened,
// so the first screens of the app stay small.
import { ProductFormScreen } from './ProductFormScreen';
import { ProductScreen } from './ProductScreen';
import { StockScreen } from './StockScreen';
import { TradeScreen } from './TradeScreen';

export default function StockRoutes({ path }: { path: string }) {
  if (path === '/stock') return <StockScreen />;
  if (path === '/stock/new') return <ProductFormScreen />;
  if (path === '/stock/buy') return <TradeScreen mode="buy" />;
  if (path === '/stock/sell') return <TradeScreen mode="sell" />;
  if (path === '/stock/return') return <TradeScreen mode="return" />;
  const match = /^\/stock\/([^/]+)(\/edit)?$/.exec(path);
  if (match) return match[2] ? <ProductFormScreen productId={match[1]} /> : <ProductScreen productId={match[1]} />;
  return <StockScreen />;
}
