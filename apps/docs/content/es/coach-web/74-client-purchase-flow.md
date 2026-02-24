# Flujo de Compra del Cliente

## ¿Que es esto?

El flujo de compra del cliente es el proceso que los clientes siguen al comprar uno de tus paquetes de coaching. Desde ver tus ofertas hasta completar el pago, toda la experiencia se gestiona a traves de Athli y Stripe.

## ¿Por que es util?

Entender el flujo de compra del cliente te ayuda a optimizar tu pagina de paquetes y guiar a los clientes a traves del proceso de compra. Una experiencia de compra fluida reduce la friccion y aumenta las conversiones para tu negocio de coaching.

## Guia Paso a Paso

### Vista Previa de tu Pagina de Paquetes

1. Ve a **Negocio > Paquetes**
2. Haz clic en **Vista Previa de Paquetes** para ver la vista del cliente
3. Esto muestra exactamente lo que los clientes ven cuando visitan tu pagina de paquetes
4. Revisa el diseno, las descripciones y los precios para verificar su precision

> [Screenshot 1: Preview Packages button on the Packages page]

### Compartir tu Enlace de Paquetes

1. En la pagina de Paquetes, copia el enlace compartible
2. Comparte este enlace con clientes potenciales o existentes
3. Puedes compartirlo por correo electronico, redes sociales, tu sitio web o mensaje directo
4. Los clientes no necesitan una cuenta de Athli para ver la pagina de paquetes

> [Screenshot 2: Shareable packages link with copy button]

### Lo que ve el Cliente

1. El cliente abre el enlace y ve tu lista de paquetes disponibles
2. Cada paquete muestra el nombre, descripcion, precio y tipo de facturacion
3. El cliente selecciona el paquete que desea comprar
4. Es dirigido a una pagina de pago de Stripe
5. El cliente ingresa su informacion de pago de forma segura a traves de Stripe
6. Despues del pago exitoso, la compra se confirma

> [Screenshot 3: Client-facing packages page showing available coaching packages]

### Despues de la Compra

1. La compra del cliente aparece en tu seccion **Negocio > Actividad**
2. Si una secuencia esta vinculada al paquete, se ejecuta automaticamente
3. El cliente recibe acceso segun el tipo de paquete
4. Los paquetes recurrentes se facturan automaticamente en el intervalo establecido
5. Recibes el pago a traves de Stripe segun tu calendario de pagos

> [Screenshot 4: Activity page showing a new client purchase]

## Cosas a Tener en Cuenta

- Los clientes ingresan los datos de pago directamente en la pagina de pago segura de Stripe
- Athli nunca ve ni almacena informacion de tarjetas de credito
- El enlace de compra funciona para cualquier persona, incluso personas sin cuenta de Athli
- Las secuencias vinculadas automatizan los pasos de incorporacion despues de la compra
- Los pagos fallidos son gestionados por Stripe con logica de reintento automatico

## Preguntas Frecuentes

### ¿Pueden los clientes comprar multiples paquetes?

Si. Un cliente puede comprar mas de un paquete si tienes multiples ofertas disponibles.

### ¿Que pasa si un pago falla?

Stripe gestiona los pagos fallidos con reintentos automaticos. Puedes ver el estado del pago en **Negocio > Actividad** o en el Stripe Dashboard.

### ¿Necesitan los clientes crear una cuenta para comprar?

Los clientes pasan por el pago de Stripe para pagar. La creacion de cuenta depende de tu configuracion de incorporacion y la secuencia vinculada al paquete.

### ¿Puedo personalizar la apariencia de la pagina de paquetes?

La pagina de paquetes usa un diseno estandar con los detalles de tus paquetes. Concentrate en escribir nombres y descripciones claras para presentar tus servicios profesionalmente.

### ¿Que tan rapido recibo el pago?

El tiempo de pago depende de la configuracion de tu cuenta de Stripe. Por defecto, Stripe procesa los pagos de forma continua.
