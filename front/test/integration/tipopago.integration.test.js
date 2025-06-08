// tests/integration/tipopago.integration.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import TipoPagoApp from '../../src/components/TipoPago/TipoPagoApp';
import { toast } from 'react-toastify';

// Mock de las dependencias
jest.mock('axios');
jest.mock('react-toastify');
jest.mock('../../src/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    usuario: { id: 1, nombre: 'Test User' }
  })
}));

// Mock de componentes externos
jest.mock('../../src/components/SideBar/SideBar', () => {
  return function MockSideBar() {
    return <div data-testid="sidebar">SideBar</div>;
  };
});

jest.mock('../../src/components/Footer/FooterApp', () => {
  return function MockFooterApp() {
    return <div data-testid="footer">Footer</div>;
  };
});

jest.mock('../../src/components/Paginacion/PaginacionApp', () => {
  return function MockPaginacionApp() {
    return <div data-testid="paginacion">Paginacion</div>;
  };
});

const mockedAxios = axios;

describe('TipoPago Integration Tests', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Mock de la respuesta inicial (cargar tipos de pago)
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          idTipoPago: 1,
          descripcionTipoPago: 'Efectivo',
          estadoTipoPago: 1
        },
        {
          idTipoPago: 2,
          descripcionTipoPago: 'Tarjeta',
          estadoTipoPago: 1
        }
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // PRUEBA 1: Integración completa - Agregar tipo de pago exitoso
  test('Debe agregar un nuevo tipo de pago exitosamente', async () => {
    // Configurar mock para la respuesta de agregar
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
    
    // Configurar mock para recargar datos después de agregar
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          idTipoPago: 1,
          descripcionTipoPago: 'Efectivo',
          estadoTipoPago: 1
        },
        {
          idTipoPago: 2,
          descripcionTipoPago: 'Tarjeta',
          estadoTipoPago: 1
        },
        {
          idTipoPago: 3,
          descripcionTipoPago: 'Transferencia',
          estadoTipoPago: 1
        }
      ]
    });

    render(<TipoPagoApp />);

    // Esperar a que se carguen los datos iniciales
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://backend-carniceria-la-bendicion-qcvr.onrender.com/tipopago/'
      );
    });

    // Hacer clic en el botón de agregar
    const addButton = screen.getByText('Agregar nuevo tipo de pago');
    fireEvent.click(addButton);

    // Esperar a que aparezca el modal
    await waitFor(() => {
      expect(screen.getByText('Agregar Tipo de Pago')).toBeInTheDocument();
    });

    // Llenar el formulario
    const input = screen.getByPlaceholderText('Nombre del tipo de pago');
    await userEvent.type(input, 'Transferencia');

    // Enviar el formulario
    const submitButton = screen.getByText('Agregar');
    fireEvent.click(submitButton);

    // Verificar que se llamó a la API con los datos correctos
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://backend-carniceria-la-bendicion-qcvr.onrender.com/tipopago/agregar',
        {
          descripcionTipoPago: 'Transferencia',
          estadoTipoPago: 1
        }
      );
    });

    // Verificar que se muestra el mensaje de éxito
    expect(toast.success).toHaveBeenCalledWith('Tipo de pago agregado con éxito');

    // Verificar que se vuelven a cargar los datos
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  // PRUEBA 2: Validación de campos vacíos
  test('Debe mostrar error cuando se intenta agregar con campo vacío', async () => {
    render(<TipoPagoApp />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    // Abrir modal
    const addButton = screen.getByText('Agregar nuevo tipo de pago');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Agregar Tipo de Pago')).toBeInTheDocument();
    });

    // Intentar enviar sin llenar el campo
    const submitButton = screen.getByText('Agregar');
    fireEvent.click(submitButton);

    // Verificar que se muestra error
    expect(toast.error).toHaveBeenCalledWith('Debe ingresar una descripción');

    // Verificar que NO se llamó a la API
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  // PRUEBA 3: Validación de duplicados
  test('Debe mostrar error cuando se intenta agregar tipo de pago duplicado', async () => {
    render(<TipoPagoApp />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    // Abrir modal
    const addButton = screen.getByText('Agregar nuevo tipo de pago');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Agregar Tipo de Pago')).toBeInTheDocument();
    });

    // Intentar agregar un tipo que ya existe
    const input = screen.getByPlaceholderText('Nombre del tipo de pago');
    await userEvent.type(input, 'Efectivo'); // Ya existe en los datos mock

    const submitButton = screen.getByText('Agregar');
    fireEvent.click(submitButton);

    // Verificar que se muestra error de duplicado
    expect(toast.error).toHaveBeenCalledWith(
      'El nombre del tipo de pago ya existe. Por favor, elige un nombre diferente.'
    );

    // Verificar que NO se llamó a la API
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  // PRUEBA 4: Manejo de errores de API
  test('Debe manejar errores de la API al agregar tipo de pago', async () => {
    // Configurar mock para error de API
    mockedAxios.post.mockRejectedValueOnce(new Error('Error de servidor'));

    render(<TipoPagoApp />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    // Abrir modal
    const addButton = screen.getByText('Agregar nuevo tipo de pago');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Agregar Tipo de Pago')).toBeInTheDocument();
    });

    // Llenar y enviar formulario
    const input = screen.getByPlaceholderText('Nombre del tipo de pago');
    await userEvent.type(input, 'Nuevo Tipo');

    const submitButton = screen.getByText('Agregar');
    fireEvent.click(submitButton);

    // Verificar que se muestra error
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ocurrió un error al agregar el tipo de pago');
    });
  });

  // PRUEBA 5: Carga inicial de datos
  test('Debe cargar tipos de pago al inicializar componente', async () => {
    render(<TipoPagoApp />);

    // Verificar que se llama a la API para cargar datos
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://backend-carniceria-la-bendicion-qcvr.onrender.com/tipopago/'
      );
    });

    // Verificar que se muestran los datos cargados
    await waitFor(() => {
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Tarjeta')).toBeInTheDocument();
    });
  });

  // PRUEBA 6: Funcionalidad de búsqueda
  test('Debe filtrar tipos de pago por búsqueda', async () => {
    render(<TipoPagoApp />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    // Realizar búsqueda
    const searchInput = screen.getByPlaceholderText('Buscar tipo de pago por descripción');
    await userEvent.type(searchInput, 'Efectivo');

    // Verificar que se filtra correctamente
    await waitFor(() => {
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.queryByText('Tarjeta')).not.toBeInTheDocument();
    });
  });
});