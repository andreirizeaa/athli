# Integraciones de Terceros y Procesamiento de Datos

## ¿Que es esto?

Athli usa varios servicios de terceros para proporcionar una plataforma de coaching segura, confiable y rica en funciones. Este articulo explica donde fluyen tus datos, que hace cada servicio y como se protege tu informacion.

## ¿Por que es util?

Entender como se manejan tus datos genera confianza y te ayuda a tomar decisiones informadas. Ya sea que te preocupe la seguridad de pagos, el almacenamiento de datos o las analiticas, esta vision general cubre las integraciones clave y sus funciones.

## Guia Paso a Paso

### Servicios de Infraestructura

**AWS (Amazon Web Services)**

- Proporciona alojamiento en la nube y almacenamiento de datos para la plataforma Athli
- Tus datos de coaching, perfiles de clientes, entrenamientos y archivos se almacenan en servidores de AWS
- AWS ofrece seguridad de nivel empresarial, encriptacion y redundancia

**Google Cloud Platform**

- Proporciona servicios adicionales en la nube utilizados por la plataforma
- Soporta funciones especificas de la plataforma y tareas de procesamiento

### Procesamiento de Pagos

**Stripe**

- Gestiona todo el procesamiento de pagos para paquetes de coaching
- Cuando los clientes compran un paquete, ingresan los datos de pago en la pagina de pago segura de Stripe
- Athli no almacena, ve ni tiene acceso a la informacion de tarjetas de credito
- Stripe cumple con PCI-DSS, cumpliendo con el estandar mas alto para seguridad de datos de pago
- Gestiona pagos, reembolsos y disputas directamente a traves de tu Stripe Dashboard

### Analiticas

**PostHog**

- Proporciona analiticas de producto para ayudar a mejorar la plataforma Athli
- Rastrea patrones de uso para entender como los entrenadores usan las funciones
- Los datos se utilizan para identificar areas de mejora y priorizar nuevas funciones
- Las analiticas se enfocan en el uso de la plataforma, no en contenido individual de coaching

### Resumen de Seguridad de Datos

Todos los datos transmitidos entre tu navegador y Athli estan encriptados usando **HTTPS**. Aqui hay un resumen de las medidas de seguridad implementadas:

| Area | Proteccion |
|---|---|
| Datos en transito | Encriptacion HTTPS en todas las conexiones |
| Datos de pago | Gestionados por Stripe (cumple con PCI-DSS) |
| Almacenamiento de datos | Asegurado en infraestructura de AWS y Google Cloud |
| Informacion de tarjetas de credito | Nunca almacenada por Athli |
| Datos de usuario | No se venden a terceros |

### Tu Privacidad

- Los datos de usuario no se venden a terceros
- Los datos de analiticas se usan para mejorar la plataforma, no para publicidad
- El contenido de coaching y los datos de clientes permanecen privados en tu cuenta
- Para detalles completos, consulta la politica de privacidad principal de Athli

## Cosas a Tener en Cuenta

- Athli depende de servicios de terceros para infraestructura, pagos y analiticas
- Todos los proveedores de terceros son seleccionados por sus estandares de seguridad y confiabilidad
- Stripe gestiona todos los datos sensibles de pago; Athli nunca procesa ni almacena datos de tarjetas
- Los datos se almacenan de forma segura en infraestructura en la nube con encriptacion en reposo y en transito
- Las analiticas de PostHog rastrean patrones de uso de la plataforma, no datos individuales de coaching de clientes

## Preguntas Frecuentes

### ¿Athli vende mis datos?

No. Los datos de usuario no se venden a terceros. Los datos se usan unicamente para operar y mejorar la plataforma.

### ¿Donde se almacenan mis datos?

Tus datos se almacenan en infraestructura de AWS y Google Cloud Platform. Ambos proveedores ofrecen seguridad y encriptacion de nivel empresarial.

### ¿Esta segura la informacion de pago de mis clientes?

Si. Stripe gestiona todos los datos de pago y cumple con PCI-DSS. Athli nunca ve ni almacena numeros de tarjetas de credito.

### ¿Que rastrea PostHog?

PostHog rastrea como los entrenadores usan las funciones de la plataforma, como que paginas se visitan y que herramientas se usan. No accede a tu contenido de coaching ni a datos de clientes.

### ¿Donde puedo leer la politica de privacidad completa?

La politica de privacidad completa esta disponible en el sitio web de Athli. Cubre todas las practicas de manejo de datos, politicas de retencion y tus derechos.
