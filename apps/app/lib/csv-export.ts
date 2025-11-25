export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) {
    return
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Headers row
    headers.map((header) => `"${String(header).replace(/"/g, '""')}"`).join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? ""
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(",")
    ),
  ].join("\n")

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

