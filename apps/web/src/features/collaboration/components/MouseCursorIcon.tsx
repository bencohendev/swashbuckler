interface MouseCursorIconProps {
  color: string
}

export function MouseCursorIcon({ color }: MouseCursorIconProps) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.928 0.640L15.168 10.752L8.064 11.648L4.288 18.560L0.928 0.640Z"
        fill={color}
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
