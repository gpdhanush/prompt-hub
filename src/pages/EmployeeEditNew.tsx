import { useParams } from "react-router-dom";
import EmployeeForm from "@/components/employee/EmployeeForm";

export default function EmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-destructive">Employee ID is required</div>
      </div>
    );
  }

  return <EmployeeForm mode="edit" employeeId={Number(id)} />;
}
