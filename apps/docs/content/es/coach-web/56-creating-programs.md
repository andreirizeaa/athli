# Crear un Programa de Entrenamiento

## ¿Que es esto?

Un programa de entrenamiento en Athli es un plan estructurado de multiples semanas que organiza entrenamientos a traves de dias y semanas. El constructor de programas proporciona una cuadricula de calendario semanal visual donde cada columna representa un dia y cada fila representa una semana. Disenas el programa una vez y luego lo asignas a cualquier cliente, llenando automaticamente su calendario de entrenamiento.

## ¿Por que es util?

- Planifica semanas o meses de entrenamiento por adelantado en lugar de construir dia a dia
- Visualiza toda la estructura del programa de un vistazo con la cuadricula de calendario
- Reutiliza la misma plantilla de programa para multiples clientes
- Construye sobrecarga progresiva duplicando y modificando semanas
- Ahorra tiempo creando programas una vez y asignandolos repetidamente

## Guia Paso a Paso

### Crear un Nuevo Programa

1. Ve a **Biblioteca** en la barra lateral.
2. Selecciona la pestana **Entrenamiento**.
3. Haz clic en **Programas**.
4. Haz clic en **Nuevo Programa**.
5. Se abre un panel lateral — completa los detalles del programa:
   - **Nombre** - Un nombre descriptivo (ej., "Fuerza para Principiantes 12 Semanas").
   - **Descripcion** - Resumen opcional de los objetivos y estructura del programa.
   - **Duracion** - Numero de semanas que abarca el programa.
   - **Dificultad** - El nivel de dificultad previsto.
6. Guarda para crear el programa.
7. Haz clic en el programa recien creado en la cuadricula para abrir el constructor de programas.

> [Screenshot 1: panel lateral para crear un nuevo programa con campos de nombre, descripcion, duracion y dificultad]

### Entender la Cuadricula del Constructor de Programas

El constructor de programas muestra una cuadricula de calendario semanal:

- Las **columnas** representan los dias de la semana (lunes a domingo).
- Las **filas** representan las semanas (Semana 1, Semana 2, Semana 3, etc.).
- Cada **celda** es un espacio de dia donde puedes agregar un entrenamiento.
- Las celdas vacias representan dias de descanso.

> [Screenshot 2: program builder grid showing weeks as rows and days as columns with some workout cards placed]

### Agregar Entrenamientos a los Dias

Haz clic en cualquier celda de dia en la cuadricula para agregar un entrenamiento. Tienes dos opciones:

1. **Crear un nuevo entrenamiento** - Construye un entrenamiento desde cero directamente en la celda usando el constructor de entrenamientos.
2. **Agregar desde la biblioteca** - Selecciona un entrenamiento existente de tu biblioteca de entrenamientos guardados.

> [Screenshot 3: day cell clicked showing options to create new workout or add from library]

### Arrastrar y Soltar

Puedes arrastrar tarjetas de entrenamiento entre celdas de dias para reorganizar tu programa:

1. Haz clic y manten presionada una tarjeta de entrenamiento.
2. Arrastrala a un dia o semana diferente.
3. Suelta para colocarla en la nueva posicion.

Esto facilita reestructurar tu programa sin eliminar y recrear entrenamientos.

### Insertar y Duplicar Semanas

- **Insertar Semana** - Haz clic en el boton de insertar semana para agregar una fila de semana en blanco en la posicion deseada.
- **Duplicar Semana** - Pasa el cursor sobre una fila de semana y haz clic en el icono de copiar. Todos los entrenamientos de esa semana se duplican en una nueva fila debajo. Esta es la forma mas rapida de construir sobrecarga progresiva: duplica una semana y luego ajusta los pesos o repeticiones hacia arriba.

> [Screenshot 4: week row with insert and duplicate buttons visible]

### Editar Detalles del Programa

Para actualizar el nombre, descripcion, duracion o dificultad del programa despues de la creacion:

1. Haz clic en **Editar Detalles** en el encabezado del constructor de programas.
2. Haz tus cambios.
3. Haz clic en **Guardar**.

### Guardar Entrenamientos en la Biblioteca desde el Programa

Si construyes un entrenamiento dentro del programa que quieres reutilizar en otro lugar:

1. Haz clic en la tarjeta del entrenamiento en la cuadricula.
2. Haz clic en **Guardar en Biblioteca**.
3. El entrenamiento ahora esta disponible en tu biblioteca de entrenamientos para usar en otros programas o entrenamiento de clientes.

> [Screenshot 5: workout card context menu with Save to Library option]

## Cosas a Tener en Cuenta

- El constructor de programas guarda automaticamente mientras trabajas, pero siempre verifica que los cambios se hayan guardado antes de navegar fuera.
- Los dias de descanso son simplemente celdas de dia vacias. No necesitas marcarlos explicitamente.
- Editar una plantilla de programa no cambia retroactivamente los entrenamientos ya asignados a clientes.
- Los programas pueden ser de cualquier numero de semanas. No hay minimo ni maximo.
- Puedes tener multiples programas en tu biblioteca para diferentes objetivos, niveles y tipos de clientes.

## Preguntas Frecuentes

### ¿Puedo crear un programa de mas de 12 semanas?

Si. Los programas pueden ser de cualquier numero de semanas. Establece la duracion al crear el programa, o agrega semanas segun sea necesario en el constructor.

### ¿Puedo reorganizar las semanas en el programa?

Si. Puedes arrastrar y soltar entrenamientos entre dias y semanas, y puedes insertar o duplicar semanas en cualquier posicion.

### ¿Que pasa si elimino un entrenamiento de la cuadricula del programa?

El entrenamiento se elimina de esa celda de dia. Si tambien estaba guardado en tu biblioteca, la version de la biblioteca no se ve afectada.

### ¿Puedo previsualizar lo que vera un cliente?

El constructor de programas muestra la misma estructura que tus clientes seguiran. Cada dia con un entrenamiento se convierte en una sesion programada en el calendario del cliente una vez asignado.
