export function createCrosshair() {
  const crosshairSize = 20
  const crosshairThickness = 2

  const crosshairDiv = document.createElement('div')
  crosshairDiv.style.position = 'fixed'
  crosshairDiv.style.top = '50%'
  crosshairDiv.style.left = '50%'
  crosshairDiv.style.width = crosshairSize + 'px'
  crosshairDiv.style.height = crosshairSize + 'px'
  crosshairDiv.style.marginTop = -(crosshairSize / 2) + 'px'
  crosshairDiv.style.marginLeft = -(crosshairSize / 2) + 'px'
  crosshairDiv.style.pointerEvents = 'none'
  crosshairDiv.style.zIndex = '1000'

  const horizontal = document.createElement('div')
  horizontal.style.position = 'absolute'
  horizontal.style.top = '50%'
  horizontal.style.left = '0'
  horizontal.style.width = '100%'
  horizontal.style.height = crosshairThickness + 'px'
  horizontal.style.backgroundColor = 'white'
  horizontal.style.marginTop = -(crosshairThickness / 2) + 'px'

  const vertical = document.createElement('div')
  vertical.style.position = 'absolute'
  vertical.style.left = '50%'
  vertical.style.top = '0'
  vertical.style.width = crosshairThickness + 'px'
  vertical.style.height = '100%'
  vertical.style.backgroundColor = 'white'
  vertical.style.marginLeft = -(crosshairThickness / 2) + 'px'

  crosshairDiv.appendChild(horizontal)
  crosshairDiv.appendChild(vertical)
  document.body.appendChild(crosshairDiv)
}
