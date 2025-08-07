import type { FC } from "react";
import {
  Button,
  Icon,
  Input,
  Notification,
  useNotify,
  Spinner,
} from "@canonical/react-components";
import type { LxdGPUDevice } from "types/device";
import type { InstanceAndProfileFormikProps } from "./instanceAndProfileFormValues";
import { getInheritedGPUs } from "util/configInheritance";
import AttachGPUBtn from "components/forms/SelectGPUBtn";
import type { GpuCard } from "types/resources";
import ScrollableForm from "components/ScrollableForm";
import RenameDeviceInput from "components/forms/RenameDeviceInput";
import ConfigurationTable from "components/ConfigurationTable";
import type { MainTableRow } from "@canonical/react-components/dist/components/MainTable/MainTable";
import { getConfigurationRowBase } from "components/ConfigurationRow";
import classnames from "classnames";
import {
  addNoneDevice,
  deduplicateName,
  findNoneDeviceIndex,
  removeDevice,
} from "util/formDevices";
import { getInheritedDeviceRow } from "components/forms/InheritedDeviceRow";
import { deviceKeyToLabel, getExistingDeviceNames } from "util/devices";
import { ensureEditMode } from "util/instanceEdit";
import { useDocs } from "context/useDocs";
import GPUDeviceInput from "components/forms/GPUDeviceInput";
import { useProfiles } from "context/useProfiles";

interface Props {
  formik: InstanceAndProfileFormikProps;
  project: string;
}

const GPUDevicesForm: FC<Props> = ({ formik, project }) => {
  const docBaseLink = useDocs();
  const notify = useNotify();

  const {
    data: profiles = [],
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfiles(project);

  if (profileError) {
    notify.failure("Loading profiles failed", profileError);
  }

  const inheritedGPUs = getInheritedGPUs(formik.values, profiles);

  const existingDeviceNames = getExistingDeviceNames(formik.values, profiles);

  const addGPUCard = (card: GpuCard) => {
    const drmId = card.drm?.id ? card.drm.id.toString() : undefined;

    const copy = [...formik.values.devices];
    copy.push({
      type: "gpu",
      gputype: "physical",
      pci: card.pci_address,
      id: card.pci_address === undefined ? drmId : undefined,
      name: deduplicateName("gpu", 1, existingDeviceNames),
    });
    formik.setFieldValue("devices", copy);
  };

  const hasCustomGPU = formik.values.devices.some(
    (item) => item.type === "gpu",
  );

  const inheritedRows: MainTableRow[] = [];
  inheritedGPUs.forEach((item) => {
    const noneDeviceId = findNoneDeviceIndex(item.key, formik);
    const isNoneDevice = noneDeviceId !== -1;

    inheritedRows.push(
      getConfigurationRowBase({
        className: "no-border-top override-with-form",
        configuration: (
          <div
            className={classnames("device-name", {
              "u-text--muted": isNoneDevice,
            })}
          >
            <b>{item.key}</b>
          </div>
        ),
        inherited: (
          <div className="p-text--small u-text--muted u-no-margin--bottom">
            From: {item.source}
          </div>
        ),
        override: isNoneDevice ? (
          <Button
            appearance="base"
            type="button"
            title="Reattach GPU"
            onClick={() => {
              ensureEditMode(formik);
              removeDevice(noneDeviceId, formik);
            }}
            className="has-icon u-no-margin--bottom"
          >
            <Icon name="connected"></Icon>
            <span>Reattach</span>
          </Button>
        ) : (
          <Button
            appearance="base"
            type="button"
            onClick={() => {
              ensureEditMode(formik);
              addNoneDevice(item.key, formik);
            }}
            className="has-icon u-no-margin--bottom"
            dense
            title={formik.values.editRestriction ?? "Detach GPU"}
            disabled={!!formik.values.editRestriction}
          >
            <Icon name="disconnect"></Icon>
            <span>Detach</span>
          </Button>
        ),
      }),
    );

    Object.keys(item.gpu).forEach((key) => {
      if (key === "name" || key === "type") {
        return;
      }

      inheritedRows.push(
        getInheritedDeviceRow({
          label: deviceKeyToLabel(key),
          inheritValue: item.gpu[key as keyof typeof item.gpu],
          readOnly: false,
          isDeactivated: isNoneDevice,
        }),
      );
    });
  });

  const customRows: MainTableRow[] = [];
  formik.values.devices.forEach((formDevice, index) => {
    if (formDevice.type !== "gpu") {
      return;
    }
    const device = formik.values.devices[index] as LxdGPUDevice;

    customRows.push(
      getConfigurationRowBase({
        className: "no-border-top custom-device-name",
        configuration: (
          <RenameDeviceInput
            name={device.name}
            index={index}
            setName={(name) => {
              ensureEditMode(formik);
              formik.setFieldValue(`devices.${index}.name`, name);
            }}
            disableReason={formik.values.editRestriction}
          />
        ),
        inherited: "",
        override: (
          <Button
            className="u-no-margin--top u-no-margin--bottom"
            onClick={() => {
              ensureEditMode(formik);
              removeDevice(index, formik);
            }}
            type="button"
            appearance="base"
            hasIcon
            dense
            title={formik.values.editRestriction ?? "Detach GPU"}
            disabled={!!formik.values.editRestriction}
          >
            <Icon name="disconnect" />
            <span>Detach</span>
          </Button>
        ),
      }),
    );

    Object.keys(device).forEach((key) => {
      if (key === "name" || key === "type" || key === "pci" || key === "id") {
        return;
      }

      customRows.push(
        getInheritedDeviceRow({
          label: deviceKeyToLabel(key),
          inheritValue: device[key as keyof typeof device],
          readOnly: false,
        }),
      );
    });

    customRows.push(
      getInheritedDeviceRow({
        label: "Identify by",
        inheritValue: (
          <GPUDeviceInput
            device={device}
            onChange={(pci, id) => {
              ensureEditMode(formik);
              formik.setFieldValue(`devices.${index}.pci`, pci);
              formik.setFieldValue(`devices.${index}.id`, id);
            }}
            disableReason={formik.values.editRestriction}
          />
        ),
        readOnly: false,
      }),
    );
  });

  if (isProfileLoading) {
    return <Spinner className="u-loader" text="Loading..." />;
  }

  return (
    <ScrollableForm className="device-form">
      {/* hidden submit to enable enter key in inputs */}
      <Input type="submit" hidden value="Hidden input" />

      <Notification severity="information" title="GPU passthrough">
        Learn more about{" "}
        <a
          href={`${docBaseLink}/reference/devices_gpu/#devices-gpu`}
          target="_blank"
          rel="noopener noreferrer"
        >
          GPU devices
        </a>{" "}
        and{" "}
        <a
          href={`${docBaseLink}/howto/container_gpu_passthrough_with_docker/#container-gpu-passthrough-with-docker`}
          target="_blank"
          rel="noopener noreferrer"
        >
          how to pass an NVIDIA GPU to a container
        </a>
      </Notification>

      {inheritedRows.length > 0 && (
        <div className="inherited-devices">
          <h2 className="p-heading--4">Inherited GPU devices</h2>
          <ConfigurationTable rows={inheritedRows} />
        </div>
      )}

      {hasCustomGPU && (
        <div className="custom-devices">
          <h2 className="p-heading--4 custom-devices-heading">
            Custom GPU devices
          </h2>
          <ConfigurationTable rows={customRows} />
        </div>
      )}

      <AttachGPUBtn
        onSelect={(card) => {
          ensureEditMode(formik);
          addGPUCard(card);
        }}
        disabledReason={formik.values.editRestriction}
      />
    </ScrollableForm>
  );
};
export default GPUDevicesForm;
