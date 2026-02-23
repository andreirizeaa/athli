# Crear Paquetes

## ¿Que es esto?

Los Paquetes son los productos de coaching que vendes a los clientes a traves de Athli. Cada paquete tiene un nombre, descripcion, precio y tipo de facturacion. Puedes crear multiples paquetes para ofrecer diferentes niveles de servicios de coaching.

## ¿Por que es util?

Los paquetes te permiten presentar profesionalmente tus servicios de coaching con precios claros. Los clientes pueden explorar tus ofertas y comprar directamente, eliminando el ir y venir de la facturacion manual. Tambien puedes vincular secuencias a paquetes para flujos de trabajo automatizados despues de la compra.

## Guia Paso a Paso

### Crear un Nuevo Paquete

1. Ve a **Negocio > Paquetes**
2. Haz clic en **Crear Paquete**
3. Completa los siguientes campos:
   - **Nombre** (ej., "Coaching Mensual Premium")
   - **Descripcion** de lo que incluye el paquete
   - **Precio** y moneda
   - **Tipo de facturacion**: elige entre pago unico o suscripcion recurrente
   - **Duracion** para paquetes recurrentes (mensual, trimestral, anual, etc.)
4. Haz clic en **Guardar**

> [Screenshot: Create package form with name, description, price, and billing type fields]

### Configurar Diferentes Niveles

Puedes crear multiples paquetes para ofrecer diferentes niveles de servicio:

- **Basico** - Check-ins limitados, entrenamiento autoguiado
- **Premium** - Check-ins semanales, programacion personalizada
- **VIP** - Soporte diario, coaching totalmente personalizado

Cada nivel puede tener su propio precio, descripcion y automatizacion vinculada.

> [Screenshot: Packages list showing multiple tiers with different prices]

### Vincular una Secuencia a un Paquete

1. Abre un paquete existente o crea uno nuevo
2. En la configuracion del paquete, busca la opcion **Secuencia**
3. Selecciona una secuencia para vincular
4. Cuando un cliente compre este paquete, la secuencia vinculada se ejecuta automaticamente

Esto es util para incorporar nuevos clientes despues de la compra, enviar materiales de bienvenida o asignar entrenamientos iniciales.

### Desactivar un Paquete

1. Ve a **Negocio > Paquetes**
2. Encuentra el paquete que deseas desactivar
3. Cambia el estado del paquete a inactivo
4. El paquete ya no es visible para los clientes pero permanece en tu lista para reactivacion

## Cosas a Tener en Cuenta

- Puedes desactivar paquetes sin eliminarlos permanentemente
- Los paquetes desactivados se ocultan de la pagina de paquetes visible para los clientes
- Vincular una secuencia a un paquete automatiza las acciones posteriores a la compra
- Los paquetes recurrentes facturan automaticamente a los clientes en el intervalo establecido a traves de Stripe
- Debes tener Stripe conectado antes de crear paquetes

## Preguntas Frecuentes

### ¿Puedo editar un paquete despues de crearlo?

Si. Ve a **Negocio > Paquetes**, haz clic en el paquete y actualiza cualquier campo. Los cambios se aplican solo a nuevas compras.

### ¿Que pasa cuando desactivo un paquete?

Los suscriptores existentes continuan con su suscripcion actual. Los nuevos clientes no pueden comprar el paquete desactivado.

### ¿Puedo ofrecer pruebas gratuitas antes de cobrar?

Stripe admite periodos de prueba en suscripciones recurrentes. Configura esto en los ajustes de tu paquete.

### ¿Puedo vincular multiples secuencias a un paquete?

Cada paquete admite una secuencia vinculada. Si necesitas multiples automatizaciones, combina los pasos en una sola secuencia.
