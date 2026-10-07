import { colors } from '@mui/material';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0055A4',
      light: '#3377B6',
      dark: '#003B72',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FECB00',
    },
    background: {
      default: '#f4f6f8',
    },
  },
  typography: {
    fontFamily: "'Play', sans-serif",
    h1: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          padding: '8px 20px',
          transition: '0.3s ease-out',
          fontSize: '1rem',
          //backgroundColor: 'white',
          //color: '#0055A4',
          '&:hover': {
            transform: 'scale(1.05)',
            backgroundColor: '#003f7b',
            color: 'white'
          }
        },
        // containedPrimary: {
        //   boxShadow: 'none',
        //   '&:hover': {
        //     boxShadow: '0px 4px 10px rgba(0, 85, 164, 0.3)',
        //     backgroundColor: '#004a8f',
        //   },
        // },
        // outlined: {
        //   borderWidth: '2px',
        //   '&:hover': {
        //     borderWidth: '2px',
        //   },
        // },
      },
    //   defaultProps: {
    //     disableElevation: true,
    //   },
    },
  },
});

export default theme;