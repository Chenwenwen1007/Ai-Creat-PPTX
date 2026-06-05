// ** Type Imports
import { PaletteMode } from '@mui/material'
import { Skin, ThemeColor } from 'src/@core/layouts/types'

/**
 * 默认调色板 - 基于Polanyi默会知识理念设计
 * 以黑白色调为主，允许其他色系的柔和色调
 * 日间模式：纯净白底+深色文字+柔和灰调
 * 夜间模式：深黑底+浅色文字+柔和灰调
 */
const DefaultPalette = (mode: PaletteMode, skin: Skin, themeColor: ThemeColor) => {
  // ** Vars
  const whiteColor = '#FFF'
  const blackColor = '#000'

  // 日间模式使用深色文字基色，夜间模式使用浅色文字基色
  const lightColor = '30, 30, 30'
  const darkColor = '230, 230, 230'
  const mainColor = mode === 'light' ? lightColor : darkColor

  const primaryGradient = () => {
    // 黑白灰调为主，柔和过渡
    if (themeColor === 'primary') {
      return '#888'
    } else if (themeColor === 'secondary') {
      return '#9C9FA4'
    } else if (themeColor === 'success') {
      return '#8CB369'
    } else if (themeColor === 'error') {
      return '#C97B7B'
    } else if (themeColor === 'warning') {
      return '#D4A76A'
    } else {
      return '#7BA7C9'
    }
  }

  const defaultBgColor = () => {
    if (skin === 'bordered' && mode === 'light') {
      return whiteColor
    } else if (skin === 'bordered' && mode === 'dark') {
      return '#1a1a1a'
    } else if (mode === 'light') {
      return '#F5F5F5'
    } else return '#0a0a0a'
  }

  return {
    customColors: {
      dark: darkColor,
      main: mainColor,
      light: lightColor,
      primaryGradient: primaryGradient(),
      bodyBg: mode === 'light' ? '#F5F5F5' : '#0a0a0a',
      trackBg: mode === 'light' ? '#E8E8E8' : '#2a2a2a',
      darkBg: skin === 'bordered' ? '#1a1a1a' : '#0a0a0a',
      lightBg: skin === 'bordered' ? whiteColor : '#F5F5F5',
      tableHeaderBg: mode === 'light' ? '#FAFAFA' : '#1a1a1a'
    },
    mode: mode,
    common: {
      black: blackColor,
      white: whiteColor
    },
    primary: {
      light: '#999',
      main: '#666',
      dark: '#444',
      contrastText: whiteColor
    },
    secondary: {
      light: '#9C9FA4',
      main: '#8A8D93',
      dark: '#777B82',
      contrastText: whiteColor
    },
    error: {
      light: '#D49090',
      main: '#C97B7B',
      dark: '#B06868',
      contrastText: whiteColor
    },
    warning: {
      light: '#DDB882',
      main: '#D4A76A',
      dark: '#C09558',
      contrastText: whiteColor
    },
    info: {
      light: '#8FB8D4',
      main: '#7BA7C9',
      dark: '#6996B8',
      contrastText: whiteColor
    },
    success: {
      light: '#9FC47E',
      main: '#8CB369',
      dark: '#7AA258',
      contrastText: whiteColor
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#F5F5F5',
      A200: '#EEEEEE',
      A400: '#BDBDBD',
      A700: '#616161'
    },
    text: {
      primary: `rgba(${mainColor}, 0.87)`,
      secondary: `rgba(${mainColor}, 0.6)`,
      disabled: `rgba(${mainColor}, 0.38)`
    },
    divider: `rgba(${mainColor}, 0.12)`,
    background: {
      paper: mode === 'light' ? whiteColor : '#1a1a1a',
      default: defaultBgColor()
    },
    action: {
      active: `rgba(${mainColor}, 0.54)`,
      hover: `rgba(${mainColor}, 0.04)`,
      selected: `rgba(${mainColor}, 0.08)`,
      disabled: `rgba(${mainColor}, 0.26)`,
      disabledBackground: `rgba(${mainColor}, 0.12)`,
      focus: `rgba(${mainColor}, 0.12)`
    }
  }
}

export default DefaultPalette
