# Paquetes de Negocio y Pagos

## Que es esto?

La seccion de Negocio te permite crear paquetes de coaching, establecer precios, aceptar pagos a traves de Stripe y gestionar las finanzas de tu negocio de coaching. Los clientes pueden comprar paquetes directamente y pagarte a traves de la plataforma.

## Por que es util

Recibir pagos no deberia ser complicado. Con el sistema de pagos integrado de Athli, puedes crear paquetes profesionales, compartirlos con clientes y recibir pagos sin necesidad de una plataforma de pagos separada.

## Casos de Uso

- Crear una suscripcion mensual de coaching ($199/mes)
- Ofrecer un paquete unico de transformacion de 12 semanas
- Configurar diferentes niveles (Basico, Premium, VIP)
- Gestionar pagos de clientes y ver historial de transacciones

## Guia Paso a Paso

### Conectar Stripe

Antes de poder aceptar pagos, necesitas conectar tu cuenta de Stripe:

1. Ve a **Negocio** en la barra lateral
2. Haz clic en **Conectar Stripe**
3. Seras redirigido a Stripe para crear o conectar tu cuenta
4. Completa el proceso de incorporacion de Stripe
5. Una vez conectado, puedes comenzar a crear paquetes

> [Screenshot 1: Pagina de negocio con boton de Conectar Stripe]

### Crear un Paquete

1. Ve a **Negocio > Paquetes**
2. Haz clic en **Crear Paquete**
3. Completa los detalles:
   - **Nombre** (ej., "Coaching Mensual Premium")
   - **Descripcion** de lo que esta incluido
   - **Precio** y moneda
   - **Tipo de facturacion** (unico o recurrente)
   - **Duracion** para paquetes recurrentes (mensual, trimestral, etc.)
4. Haz clic en **Guardar**

> [Screenshot 2: Formulario de crear paquete con opciones de precio]

### Compartir Paquetes con Clientes

1. En la pagina de Paquetes, haz clic en **Vista Previa de Paquetes**
2. Esto muestra la vista de tus paquetes orientada al cliente
3. Copia el enlace y compartelo con clientes
4. Los clientes pueden ver tus paquetes y comprar directamente

> [Screenshot 3: Pagina de vista previa de paquetes como la ven los clientes]

### Ver Actividad de Pagos

1. Ve a **Negocio > Actividad**
2. Veras una lista de todas las transacciones, suscripciones y eventos de pago
3. Filtra por fecha, cliente o estado

> [Screenshot 4: Pagina de actividad con lista de transacciones]

### Gestionar el Panel de Stripe

1. Ve a **Negocio**
2. Haz clic en **Panel de Stripe**
3. Seras llevado a tu panel de Stripe para gestion financiera detallada
4. Gestiona reembolsos, disputas y pagos desde Stripe directamente

## Cosas a Tener en Cuenta

- La funcion de Pagos requiere el complemento de Pagos en ciertos planes
- Stripe maneja todo el procesamiento de pagos de forma segura
- Athli no almacena informacion de tarjetas de credito
- Los pagos se gestionan a traves de la configuracion de tu cuenta de Stripe
- Puedes desactivar paquetes sin eliminarlos

## Problemas Comunes

**La conexion de Stripe fallo**
Asegurate de completar todos los pasos en la incorporacion de Stripe. Si tienes una cuenta de Stripe existente, asegurate de que este completamente verificada.

**Un cliente no puede ver mis paquetes**
Verifica que el paquete este activo (no desactivado) y que estes compartiendo el enlace correcto.

**Quiero reembolsar un pago**
Procesa reembolsos a traves de tu Panel de Stripe. Athli no maneja reembolsos directamente.

---

## Preguntas Frecuentes

### Que porcentaje toma Athli de los pagos?

Revisa la pagina de precios actual para tarifas de plataforma. Stripe tambien cobra tarifas de procesamiento estandar.

### Puedo ofrecer pruebas gratuitas antes de cobrar?

Stripe soporta periodos de prueba en suscripciones. Configura esto en la configuracion de tu paquete.

### Necesito una cuenta de negocio para Stripe?

No. Puedes usar una cuenta personal de Stripe. Las cuentas de negocio proporcionan funciones adicionales.

### Puedo aceptar pagos en diferentes monedas?

Las opciones de moneda dependen de la configuracion de tu cuenta de Stripe y tu pais.
