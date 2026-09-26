import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, Menu, MenuItem, Tooltip } from "@mui/material";
import { useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";

interface DropdownOption<Value extends string | number> {
  value: Value;
  label: string;
}

interface DropdownParameterProps<Value extends string | number> {
  value: Value;
  onChange: (value: Value) => void;
  icon: ReactNode;
  ariaLabel: string;
  options: DropdownOption<Value>[];
  label: string;
}

function DropdownParameter<Value extends string | number>({
  value,
  onChange,
  icon,
  ariaLabel,
  options,
  label,
}: DropdownParameterProps<Value>): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const isOpen = anchorEl !== null;
  const controlledMenuId = isOpen ? menuId : undefined;
  const selectOption = (selected: Value) => {
    onChange(selected);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={ariaLabel}>
        <Button
          onClick={(event) => {
            setAnchorEl(event.currentTarget);
          }}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-controls={controlledMenuId}
          aria-expanded={isOpen}
          startIcon={icon}
          endIcon={<ArrowDropDownIcon fontSize="small" />}
          sx={{
            color: "text.secondary",
            minHeight: 44,
            px: 1,
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            "& .MuiButton-startIcon": {
              display: { xs: "none", sm: "inherit" },
            },
          }}
        >
          {label}
        </Button>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={String(option.value)}
            selected={option.value === value}
            onClick={() => {
              selectOption(option.value);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default DropdownParameter;
