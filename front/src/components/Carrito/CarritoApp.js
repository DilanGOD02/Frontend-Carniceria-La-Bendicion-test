import React, { useContext } from 'react';
import { Offcanvas, ListGroup, Button } from 'react-bootstrap';
import { useCart } from '../../contexto/ContextoCarrito';
import { useNavigate } from 'react-router-dom';
import './Carrito.css';
import useAuth from '../../hooks/useAuth';
import axios from 'axios'; 
import { useAppContext } from "../Navbar/AppContext";

function CarritoApp() {
  const {
    cart,
    removeFromCart,
    clearCart,
    showCartMenu,
    setShowCartMenu,
  } = useCart();

  const { idUsuario } = useAppContext();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + (item.montoPrecioProducto || 0) * item.cantidad, 0);

  const handleVerOrden = () => {
    setShowCartMenu(false); 
    navigate('/verOrden'); 
  };

  const handlePagar2 = async () => {
    
    if (!idUsuario) {
      navigate('/register');
      return;
    } else {
      setShowCartMenu(false); 
      navigate('/pedido');
    }
  }
  
  const handlePagar = async () => {
    if (!usuario?.idUsuario) {
      navigate('/register');
      return;
    }
  
    try {
      const token = localStorage.getItem('token');
      const carritoLocal = JSON.parse(localStorage.getItem('carrito')) || localStorage.getItem('carrito');
      
      if (carritoLocal.length === 0) {
        alert('El carrito está vacío');
        return;
      }
  
      const total = carritoLocal.reduce((sum, item) => sum + (item.montoPrecioProducto || 0) * item.cantidad, 0);
      const cantidadTotal = carritoLocal.reduce((sum, item) => sum + item.cantidad, 0);
  
      const carritoData = {
        usuario: { idUsuario: usuario.idUsuario },
        montoTotalCarrito: total,
        estadoCarrito: true,
        cantidadCarrito: cantidadTotal
      };
  
      const { data: carritoCreado } = await axios.post('https://backend-carniceria-la-bendicion-qcvr.onrender.com/carrito', carritoData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      await Promise.all(
        carritoLocal.map(item => 
          axios.post(`https://backend-carniceria-la-bendicion-qcvr.onrender.com/carrito/${carritoCreado.idCarrito}/productos`, {
            idProducto: item.idProducto,
            cantidadProducto: item.cantidad
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
      );
  
      localStorage.removeItem('carrito');
      clearCart();
      navigate('/pedido', { 
        state: { 
          idCarrito: carritoCreado.idCarrito,
          total: total 
        }
      });
  
    } catch (error) {
      console.error('Error en el pago test:', error);
      alert(error.response?.data?.message || 'Error al procesar el pago');
    }
  };

  const groupedCart = cart.reduce((acc, item) => {
    const existingItem = acc.find((i) => i.idProducto === item.idProducto);
    if (existingItem) {
      existingItem.cantidad += item.cantidad;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, []);

  return (
    <Offcanvas 
      show={showCartMenu} 
      onHide={() => setShowCartMenu(false)} 
      placement="end"
      className="carrito-offcanvas"
      style={{
        position: 'fixed',
        top: '0',
        zIndex: 1200,
        height: '100vh'
      }}
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Tu carrito de compras</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="d-flex flex-column p-0" style={{ minHeight: 0 }}>
        {groupedCart.length > 0 ? (
          <>
            <div className="carrito-productos-container px-3 pt-3">
              {groupedCart.map((item, index) => (
                <div key={index} className="carrito-producto mb-3 position-relative">
                  <div className="d-flex gap-3">
                    {item.imgProducto && (
                      <img
                        src={
                          item.imgProducto.startsWith('http')
                            ? item.imgProducto
                            : `https://backend-carniceria-la-bendicion-qcvr.onrender.com/producto/images/${item.imgProducto}`
                        }
                        alt={item.nombreProducto}
                        width="60"
                        height="60"
                        className="carrito-producto-img"
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                    <div>
                      <div className="carrito-producto-nombre">{item.nombreProducto}</div>
                      <div className="carrito-producto-precio">
                        {item.cantidad} × ₡{item.montoPrecioProducto.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="carrito-btn-eliminar p-0 position-absolute end-0 top-0"
                    onClick={() => removeFromCart(item.idProducto)}
                    style={{ transform: 'translateY(25%)' }}
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>
  
            <div className="carrito-footer mt-auto">
              <div className="d-flex justify-content-between mb-3">
                <span className="carrito-subtotal-texto">Subtotal:</span>
                <span className="carrito-subtotal-valor">
                  ₡{groupedCart.reduce(
                    (total, item) => total + item.montoPrecioProducto * item.cantidad,
                    0
                  ).toLocaleString()}
                </span>
              </div>
              
              <Button 
                variant="primary" 
                className="carrito-btn-ver w-100 mb-2"
                onClick={handleVerOrden}
              >
                VER CARRITO
              </Button>
            </div>
          </>
        ) : (
          <div className="carrito-vacio p-4">
            <p>No hay productos en el carrito.</p>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default CarritoApp;