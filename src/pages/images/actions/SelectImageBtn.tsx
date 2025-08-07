import type { FC } from "react";
import { Button, usePortal } from "@canonical/react-components";
import type { LxdImageType, RemoteImage } from "types/image";
import ImageSelector from "pages/images/ImageSelector";

interface Props {
  onSelect: (image: RemoteImage, type?: LxdImageType) => void;
}

const SelectImageBtn: FC<Props> = ({ onSelect }) => {
  const { openPortal, closePortal, isOpen, Portal } = usePortal();

  const handleSelect = (image: RemoteImage, type?: LxdImageType) => {
    closePortal();
    onSelect(image, type);
  };

  return (
    <>
      <Button
        appearance="positive"
        onClick={openPortal}
        type="button"
        id="select-image"
      >
        <span>Browse images</span>
      </Button>
      {isOpen && (
        <Portal>
          <ImageSelector onClose={closePortal} onSelect={handleSelect} />
        </Portal>
      )}
    </>
  );
};

export default SelectImageBtn;
