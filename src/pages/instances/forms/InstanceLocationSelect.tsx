import type { FC } from "react";
import { useState } from "react";
import { Input, Select } from "@canonical/react-components";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "util/queryKeys";
import Loader from "components/Loader";
import { useSettings } from "context/useSettings";
import { fetchClusterGroups } from "api/cluster";
import type { FormikProps } from "formik/dist/types";
import type { CreateInstanceFormValues } from "pages/instances/CreateInstance";
import { isClusteredServer } from "util/settings";

interface Props {
  formik: FormikProps<CreateInstanceFormValues>;
}

const figureDefaultGroup = (target?: string) => {
  if (!target?.startsWith("@")) {
    return "default";
  }
  return target.split("@")[1];
};

const figureDefaultMember = (target?: string) => {
  if (!target || target.startsWith("@")) {
    return "";
  }
  return target;
};

const InstanceLocationSelect: FC<Props> = ({ formik }) => {
  const { data: settings } = useSettings();
  const isClustered = isClusteredServer(settings);

  if (!isClustered) {
    return <></>;
  }

  const defaultGroup = figureDefaultGroup(formik.values.target);
  const [selectedGroup, setSelectedGroup] = useState(defaultGroup);
  const defaultMember = figureDefaultMember(formik.values.target);
  const [selectedMember, setSelectedMember] = useState(defaultMember);

  const { data: clusterGroups = [], isLoading } = useQuery({
    queryKey: [queryKeys.cluster, queryKeys.groups],
    queryFn: fetchClusterGroups,
  });

  if (isLoading) {
    return <Loader />;
  }

  const setGroup = (group: string) => {
    formik.setFieldValue("target", `@${group}`);
    setSelectedGroup(group);
    setSelectedMember("");
  };

  const setMember = (member: string) => {
    if (member === "") {
      setGroup(selectedGroup);
    } else {
      formik.setFieldValue("target", member);
      setSelectedMember(member);
    }
  };

  const availableMembers =
    clusterGroups.find((group) => group.name === selectedGroup)?.members ?? [];

  const isPreselected = (formik.values as { targetSelectedByVolume?: boolean })
    .targetSelectedByVolume;

  if (isPreselected) {
    return (
      <Input
        id="clusterMember"
        label="Cluster member"
        value={formik.values.target}
        disabled
        help="Member is determined by the selected ISO volume and can't be changed."
        type="text"
      />
    );
  }

  return (
    <>
      <Select
        id="clusterGroup"
        label="Cluster group"
        onChange={(e) => {
          setGroup(e.target.value);
        }}
        value={selectedGroup}
        options={clusterGroups.map((group) => {
          return {
            label: group.name,
            value: group.name,
            disabled: group.members.length < 1,
          };
        })}
        disabled={!formik.values.image}
        title={
          formik.values.image
            ? ""
            : "Please select an image before adding a location group"
        }
      />
      <Select
        id="clusterMember"
        label="Cluster member"
        onChange={(e) => {
          setMember(e.target.value);
        }}
        value={selectedMember}
        options={[
          ...(availableMembers.length > 1 ? [{ label: "any", value: "" }] : []),
          ...availableMembers.map((member) => {
            return { label: member, value: member };
          }),
        ]}
        disabled={!formik.values.image}
        title={
          formik.values.image
            ? ""
            : "Please select an image before adding a location member"
        }
      />
    </>
  );
};

export default InstanceLocationSelect;
