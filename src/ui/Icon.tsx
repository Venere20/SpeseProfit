import { Image, View } from 'react-native';
import { colors } from './theme';
const icons = {
  home: require('../../assets/ui/home.png'), list: require('../../assets/ui/list.png'), plus: require('../../assets/ui/plus.png'), chart: require('../../assets/ui/chart.png'), settings: require('../../assets/ui/settings.png'),
  calendar: require('../../assets/ui/calendar.png'), basket: require('../../assets/ui/basket.png'), coffee: require('../../assets/ui/coffee.png'), car: require('../../assets/ui/car.png'), bag: require('../../assets/ui/bag.png'),
  lock: require('../../assets/ui/lock.png'), up: require('../../assets/ui/up.png'), down: require('../../assets/ui/down.png'), warning: require('../../assets/ui/warning.png'), clock: require('../../assets/ui/clock.png'),
  search: require('../../assets/ui/search.png'), filter: require('../../assets/ui/filter.png'), chevron: require('../../assets/ui/chevron.png'), wallet: require('../../assets/ui/wallet.png'), heart: require('../../assets/ui/heart.png'), more: require('../../assets/ui/more.png'), equal: require('../../assets/ui/equal.png'), fuel: require('../../assets/ui/fuel.png'),
};
export type IconName = keyof typeof icons;
export function Icon({ name, size = 24, color = colors.accent }: { name: IconName; size?: number; color?: string }) { return <Image accessible={false} source={icons[name]} style={{ width: size, height: size, tintColor: color }} />; }
export function categoryIcon(id: string): IconName { return ({ food: 'basket', dining: 'coffee', transport: 'car', home: 'home', health: 'heart', shopping: 'bag', leisure: 'chart', income: 'wallet', refund: 'wallet' } as Record<string, IconName>)[id] ?? 'more'; }
export function CategoryIcon({ id }: { id: string }) { return <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' }}><Icon name={categoryIcon(id)} size={22} /></View>; }

export function shortcutIcon(id:string,label:string):IconName { return /carburante|benzina|rifornimento/i.test(label)?'fuel':categoryIcon(id); }
