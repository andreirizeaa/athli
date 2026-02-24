# Crear Check-ins en el Movil

## Que es esto?

El constructor de check-ins movil te permite crear formularios recurrentes directamente desde tu telefono. Los check-ins son formularios que los clientes completan en un horario (diario, semanal, quincenal o mensual). El constructor te permite configurar el horario, agregar preguntas y configurar todo sin necesidad de la app web.

## Por que es util

Puedes crear o modificar formularios de check-in sobre la marcha. Si necesitas agregar rapidamente una pregunta antes del proximo envio de un cliente, o crear un nuevo check-in semanal mientras revisas tu lista de clientes, el constructor movil tiene las mismas capacidades que el web.

## Guia Paso a Paso

### Paso 1: Navegar a la Biblioteca

Ve a **Biblioteca > Formularios > Check-ins** para ver tu lista de plantillas de check-in.

> [Captura de pantalla: Pagina de Biblioteca Formularios Check-ins mostrando la lista de check-ins existentes]

### Paso 2: Crear un Check-in

1. Toca el boton **+** arriba a la derecha
2. Elige **Nuevo** para empezar desde cero, o **Plantillas** para usar una plantilla existente
3. Ingresa un nombre y descripcion
4. Configura la **frecuencia del horario**: Diario, Semanal, Quincenal o Mensual
5. Para horarios semanales/quincenales, selecciona que dias
6. Toca **Guardar** para crear el check-in y abrir el constructor de preguntas

> [Captura de pantalla: Modal de crear check-in mostrando nombre, descripcion y opciones de frecuencia]

### Paso 3: Agregar Preguntas

1. En el constructor, toca **Agregar Pregunta**
2. Elige un tipo de pregunta de la lista (ver abajo)
3. Ingresa el texto de la pregunta
4. Configura los ajustes especificos del tipo (opciones para opcion multiple, cantidad de fotos, etc.)
5. Activa **Requerido** si el cliente debe responder
6. Toca la marca de verificacion para agregar

> [Captura de pantalla: Pantalla de agregar pregunta con campo de texto, toggle de requerido y ajustes del tipo]

### Tipos de Preguntas Disponibles

**Generales:**

| Tipo | Descripcion | Configuracion |
|------|-------------|---------------|
| **Texto** | Respuesta de texto abierta | Ninguna |
| **Numero** | Entrada numerica | Ninguna |
| **Si/No** | Eleccion binaria | Ninguna |
| **Opcion Multiple** | Seleccionar entre opciones | Agregar/eliminar opciones |
| **Escala** | Deslizador de 1 a 10 | Rango fijo 1-10 |
| **Calificacion** | Calificacion con estrellas | Ninguna |
| **Fecha** | Selector de fecha | Ninguna |
| **Imagenes** | Carga de fotos | Numero de fotos (1-5) |
| **Videos** | Carga de videos | Numero de videos (1-5) |
| **Firma** | Firma digital | Ninguna |

**Preguntas de Sincronizacion (solo check-ins):**

| Tipo | Descripcion |
|------|-------------|
| **Foto de Progreso** | Se sincroniza con la galeria de progreso del cliente. Limite una por formulario. |
| **Metricas** | Vincula la respuesta a una metrica especifica para seguimiento automatico. |

Foto de Progreso y Metricas solo estan disponibles al crear un check-in para un cliente especifico (no en la biblioteca).

> [Captura de pantalla: Selector de tipos de pregunta mostrando todos los tipos disponibles]

### Editar una Pregunta

1. Toca cualquier tarjeta de pregunta
2. Modifica el texto, configuracion o toggle de requerido
3. Toca la marca de verificacion para guardar

No puedes cambiar el tipo de pregunta despues de crearla. Elimina y vuelve a agregar si necesitas un tipo diferente.

### Paso 4: Reordenar Preguntas

1. Toca **Reordenar** (visible con 2+ preguntas)
2. Manten presionada una pregunta y arrastrala a la nueva posicion
3. Toca la marca de verificacion para confirmar

> [Captura de pantalla: Pantalla de reordenar con controles de arrastre en cada tarjeta de pregunta]

### Paso 5: Editar Detalles del Check-in

Despues de crear un check-in, puedes actualizar su nombre, descripcion o horario en cualquier momento:

1. Toca el icono de lapiz en el encabezado del constructor
2. Actualiza el nombre, descripcion o frecuencia del horario
3. Para horarios semanales/quincenales, cambia los dias seleccionados
4. Toca **Guardar** para aplicar los cambios

> [Captura de pantalla: Modal de editar check-in mostrando campos editables de nombre, descripcion y horario]

### Eliminar una Pregunta

1. Toca el icono de papelera en la tarjeta de pregunta
2. Confirma en el dialogo

### Guardar

Toca la marca de verificacion en la esquina superior derecha para guardar. El boton solo esta activo cuando hay cambios sin guardar.

## Cosas a Tener en Cuenta

- La frecuencia del horario se configura al crear el check-in, no al agregar preguntas
- Las plantillas te permiten empezar desde un formulario pre-construido
- Cada formulario solo puede tener una pregunta de Foto de Progreso
- Las preguntas de metricas no se pueden duplicar si la misma metrica ya esta vinculada
- Si navegas fuera con cambios sin guardar, seras advertido

---

## Preguntas Frecuentes

### Puedo cambiar el horario despues de crear un check-in?

Si. Toca el icono de lapiz en el encabezado del constructor para abrir la configuracion y modificar el horario.

### Cual es la diferencia entre crear en la Biblioteca vs para un cliente?

Los check-ins de biblioteca son plantillas reutilizables. Los check-ins de cliente se asignan directamente. Los tipos de pregunta Foto de Progreso y Metricas solo estan disponibles en el contexto del cliente.

### Puedo crear un check-in sin horario?

Si. El horario es opcional y se puede configurar despues al asignar a un cliente.
