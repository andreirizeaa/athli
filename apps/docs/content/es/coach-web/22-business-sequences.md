# Secuencias de Negocio

Las secuencias te permiten automatizar una serie de acciones que se ejecutan despues de que un cliente compra un paquete. Piensa en ellas como flujos de trabajo post-compra: cuando un cliente compra un paquete vinculado a una secuencia, Athli ejecuta automaticamente los pasos que definiste.

## Que Es

Una secuencia es un flujo de trabajo visual construido con un editor de flujos. Defines un disparador (como un evento de pago) y luego encadenas acciones como enviar un mensaje, asignar un cuestionario, agregar habitos o esperar un tiempo determinado antes del siguiente paso.

## Por Que Es Util

- Automatiza la incorporacion de clientes despues de la compra
- Asegura que cada nuevo cliente reciba la misma experiencia de bienvenida
- Ahorra tiempo eliminando la configuracion manual repetitiva
- Crea flujos de trabajo de varios pasos con retrasos entre acciones

## Donde Encontrarlo

1. Ve a **Negocio** en la barra lateral.
2. Selecciona **Secuencias**.

> [Screenshot: sequences list page showing created sequences]

## Crear una Secuencia

1. Haz clic en **Agregar Secuencia**.
2. Ingresa un nombre y descripcion opcional.
3. Haz clic en **Guardar** para crear la secuencia.
4. Seras llevado al editor de flujos.

> [Screenshot: add sequence side panel with name and description fields]

## Usar el Editor de Flujos

El editor de flujos es un lienzo visual donde construyes tu automatizacion paso a paso.

### Disparadores

Cada secuencia comienza con un disparador. Los disparadores disponibles incluyen:

| Disparador | Descripcion |
|------------|-------------|
| Check-in completado | Se activa cuando un cliente completa un check-in |
| Entrenamiento perdido | Se activa cuando un cliente pierde un entrenamiento programado |
| Check-in perdido | Se activa cuando un cliente pierde un check-in |
| Registro de habito perdido | Se activa cuando un cliente pierde un registro de habito |
| Registro de metrica perdido | Se activa cuando un cliente pierde un registro de metrica |
| Inactivo por 7 dias | Se activa cuando un cliente ha estado inactivo por 7 dias |

### Acciones

Despues del disparador, agregas acciones que se ejecutan en orden:

| Accion | Descripcion |
|--------|-------------|
| Enviar mensaje | Envia automaticamente un mensaje de chat al cliente |
| Asignar cuestionario | Asigna un cuestionario de tu biblioteca |
| Asignar check-in | Asigna un formulario de check-in |
| Agregar archivo | Comparte un archivo con el cliente |
| Agregar habito | Asigna un habito para seguimiento |
| Agregar metrica | Asigna una metrica para seguimiento |
| Esperar | Pausa la secuencia por una duracion especificada antes de continuar |
| Check-in completado | Verificacion condicional que se ramifica segun la finalizacion |

### Construir un Flujo

1. Haz clic en el **nodo disparador** para seleccionar tu tipo de disparador.
2. Haz clic en el boton **+** abajo para agregar una accion.
3. Selecciona un tipo de accion del panel que aparece.
4. Configura la accion (ej., selecciona que cuestionario asignar).
5. Agrega mas acciones segun sea necesario, incluyendo pasos de **Esperar** para retrasos.
6. Tus cambios se guardan automaticamente.

> [Screenshot: flow editor with a trigger and multiple action nodes connected]

## Vincular una Secuencia a un Paquete

Una vez que creas una secuencia, puedes vincularla a un paquete de negocio para que se ejecute automaticamente cuando un cliente compre ese paquete.

1. Ve a **Negocio > Paquetes**.
2. Edita un paquete.
3. En el campo de secuencia, selecciona tu secuencia.
4. Guarda.

> [Screenshot: package edit form with sequence dropdown]

## Gestionar Secuencias

Desde la lista de secuencias, puedes:

- **Buscar** secuencias por nombre
- **Editar** una secuencia haciendo clic en ella
- **Eliminar** una secuencia usando el menu (nota: las secuencias vinculadas a paquetes no se pueden eliminar)

## Preguntas Frecuentes

### ¿Puedo tener multiples disparadores en una secuencia?

Cada secuencia tiene un disparador. Crea secuencias separadas para diferentes disparadores.

### ¿Que pasa si elimino una secuencia que esta vinculada a un paquete?

Athli evitara la eliminacion y mostrara un error. Desvincula la secuencia del paquete primero.

### ¿Puedo probar una secuencia sin una compra real?

Actualmente, las secuencias se ejecutan cuando se cumple la condicion del disparador. Puedes probar simulando la accion del disparador (ej., completando un check-in para un cliente de prueba).

### ¿Las acciones se ejecutan inmediatamente o en orden?

Las acciones se ejecutan en orden de arriba a abajo. Usa acciones de **Esperar** para agregar retrasos entre pasos.
