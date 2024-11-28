import type enUS from 'antd/lib/locale/en_US';
import type jaJP from 'antd/lib/locale/ja_JP';
import type viVN from 'antd/lib/locale/vi_VN';

import { EStatusState } from '@/enums';
import type { enLocale, viLocale } from '@/utils/locale';
import type State from './base/interface';

/**
 * Represents the global state of the application.
 */
export interface StateGlobal extends State {
  language?: string;
  locale?: typeof viVN | typeof enUS | typeof jaJP;
  localeDate?: typeof enLocale | typeof viLocale;
  isCollapseMenu?: boolean;
}

/**
 * Represents the initial state for the global module.
 */
export const initialState: StateGlobal = {
  isLoading: false,
  status: EStatusState.Idle,
};
