# Gestionar tu Suscripcion

## ¿Que es esto?

Esta guia cubre todo lo que necesitas saber sobre gestionar tu suscripcion de Athli: ver tu plan actual, cambiar de planes, actualizar la facturacion y manejar cambios programados.

## Ver tu Plan Actual

1. Haz clic en tu icono de perfil en la parte inferior izquierda de la barra lateral.
2. Selecciona **Facturacion**, o ve a **Ajustes > Facturacion**.
3. Veras un resumen de tu plan actual incluyendo:
   - Nombre del plan (Starter, Pro o Max)
   - Numero de clientes incluidos
   - Complementos activos
   - Precio mensual
   - Intervalo de facturacion (mensual o anual)
   - Dias de prueba restantes (si estas en prueba)

> [Screenshot: billing page showing current plan card with plan details and client usage bar]

## Uso de Clientes

La pagina de facturacion muestra una barra de progreso indicando cuantos de tus espacios de clientes estan en uso:

- **Zona verde:** Mucho espacio
- **Zona amarilla:** Acercandose a tu limite
- **Zona roja:** En o cerca de la capacidad

Si alcanzas tu limite de clientes, necesitaras mejorar tu plan o agregar espacios de clientes adicionales antes de invitar nuevos clientes.

> [Screenshot: client usage progress bar on billing page]

## Cambiar tu Plan

### Mejorar

1. Ve a **Ajustes > Facturacion**.
2. Haz clic en **Cambiar Plan**.
3. Si estas en una prueba, veras una advertencia de que seleccionar un plan termina tu prueba.
4. La pagina de precios se abre con todos los planes disponibles.
5. Selecciona un plan, ajusta el conteo de clientes si es necesario y agrega cualquier complemento.
6. Revisa el resumen en el lado derecho.
7. Confirma y completa el pago a traves de Stripe.
8. Tu nuevo plan entra en vigor inmediatamente, ¡y confeti celebra tu mejora!

> [Screenshot: pricing page in update mode showing plan cards with current plan highlighted]

### Degradar

1. Ve a **Ajustes > Facturacion**.
2. Haz clic en **Cambiar Plan**.
3. Selecciona un plan inferior.
4. Si tienes mas clientes activos de los que permite el nuevo plan, necesitaras archivar clientes primero.
5. La degradacion se programa para el final de tu periodo de facturacion actual.
6. Mantienes las caracteristicas de tu plan actual hasta que el cambio entre en vigor.

**Importante:** Las degradaciones no entran en vigor inmediatamente. Continuas con tu plan actual hasta que termine el periodo de facturacion.

> [Screenshot: billing page showing "Changes scheduled" badge with current and upcoming plan cards]

### Cambios Programados

Cuando tienes un cambio de plan pendiente (como una degradacion), la pagina de facturacion muestra dos tarjetas:

- **Plan Actual:** En el que estas ahora, con la fecha en que termina
- **Plan Proximo:** A que plan cambias en la proxima fecha de facturacion

Puedes cancelar cambios programados actualizando tu plan nuevamente antes de la fecha efectiva.

## Gestionar Complementos

### Agregar un Complemento

1. Ve a **Ajustes > Facturacion > Cambiar Plan**.
2. Desplazate a la seccion **Potencia con Complementos**.
3. Haz clic en **Agregar a mi plan** en cualquier complemento (Automatizaciones, Asistente IA o Pagos).
4. El costo se agrega al resumen de tu plan.
5. Completa el pago.

### Eliminar un Complemento

1. En la pagina de facturacion, encuentra el complemento en los detalles de tu plan actual.
2. Haz clic en la opcion de cancelar junto al complemento.
3. El complemento se programa para eliminacion al final de tu periodo de facturacion.
4. Mantienes el acceso hasta entonces.

### Reactivar un Complemento Cancelado

Si cancelaste un complemento pero cambiaste de opinion:

1. Ve a la pagina de facturacion.
2. Encuentra el complemento marcado como "cancelando".
3. Haz clic en **Reactivar** para deshacer la cancelacion.
4. El complemento continua con normalidad.

> [Screenshot: billing page showing an add-on with "cancelling" status and reactivate option]

## Ver Facturas

1. Ve a **Ajustes > Facturacion**.
2. Desplazate a la seccion **Facturas**.
3. Veras una tabla con todas tus facturas mostrando:
   - Fecha
   - Periodo
   - Monto
   - Estado (Pagada, Abierta, Borrador, Anulada)
   - Tipo (Suscripcion o Mejora)
4. Haz clic en **Ver** para abrir la factura en Stripe, o **PDF** para descargarla.

> [Screenshot: invoices table showing recent billing history]

## Facturacion desde Movil

Tambien puedes gestionar la facturacion desde la aplicacion movil:

1. Abre la aplicacion de entrenador de Athli.
2. Ve a **Ajustes > Facturacion**.
3. Esto abre la pagina de facturacion en una vista web.
4. Puedes ver tu plan, cambiar planes y gestionar complementos.
5. Despues de completar un cambio, toca **Listo** para volver a la aplicacion.

## Metodo de Pago

Los pagos se procesan a traves de Stripe. Para actualizar tu metodo de pago:

1. Ve a **Ajustes > Facturacion**.
2. Busca la opcion para gestionar tu metodo de pago (esto abre el portal de cliente de Stripe).
3. Actualiza tu tarjeta o detalles de pago.
4. Los cambios entran en vigor para el proximo ciclo de facturacion.

## Preguntas Frecuentes

### ¿Cuando entra en vigor una mejora?

Inmediatamente. Obtienes acceso a las caracteristicas del nuevo plan de inmediato.

### ¿Cuando entra en vigor una degradacion?

Al final de tu periodo de facturacion actual. Mantienes tu plan actual hasta entonces.

### ¿Puedo cambiar de facturacion mensual a anual?

Si. Ve a Cambiar Plan y selecciona facturacion Anual. Ahorraras un 17% comparado con mensual.

### ¿Que pasa si mi pago falla?

Stripe reintentara el pago automaticamente. Si continua fallando, tu suscripcion puede ser pausada. Actualiza tu metodo de pago para resolver el problema.

### ¿Puedo obtener un reembolso?

Contacta a soporte para solicitudes de reembolso. Los reembolsos se manejan caso por caso.

### ¿Pierdo mis datos si degradar?

No. Tus datos se conservan. Sin embargo, las caracteristicas del plan superior dejaran de estar disponibles hasta que mejores nuevamente.
